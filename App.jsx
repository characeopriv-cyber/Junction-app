import React, { useState, useEffect, useMemo, useRef } from "react";

// ---------------------------------------------------------------
// DEPLOYMENT NOTE — AI features fallback
// The live Junction AI chat and persona replies call the Anthropic
// API directly from the browser. That only works inside Claude's
// artifact preview (which provides a free, built-in connection).
// On a public deployment (Vercel, etc.) with no backend, those calls
// will fail. This flag detects that and shows a clear, honest message
// instead of a silent error — so visual/UX testing of every other
// feature still works perfectly. See junction-backend/ (the Next.js
// scaffold) for how to wire this up to a real, secure backend.
// ---------------------------------------------------------------
const AI_FEATURES_LIVE =
  typeof window !== "undefined" && window.location.hostname.includes("claude");

const AI_UNAVAILABLE_MSG =
  "Junction AI's live chat needs a connected backend to work outside this preview — see the deployment notes. Everything else in the app is fully interactive!";

import {
  Search,
  MessageCircle,
  LayoutGrid,
  BarChart3,
  Lock,
  Flame,
  Eye,
  MapPin,
  BedDouble,
  Bath,
  Maximize,
  Crown,
  Zap,
  ShieldCheck,
  Send,
  ChevronRight,
  Building2,
  TrendingUp,
  UserCheck,
  FileCheck2,
  Upload,
  X,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  CreditCard,
  Sparkles,
  Loader2,
  Phone,
  Video,
  Mic,
  MicOff,
  VideoOff,
  Volume2,
  PhoneOff,
  Heart,
  Share2,
  PlayCircle,
  AlertTriangle,
  Clock,
  Users,
  Wrench,
  Star,
  Leaf,
  Cpu,
  Wind,
  Sun,
  Recycle,
  Activity,
  Globe2,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ---------------------------------------------------------------
// Design tokens
// ink:    #14191F  — primary dark surface
// paper:  #F6F3ED  — light surface / background
// navy:   #1F3D5C  — brand / primary actions
// signal: #FF5A36  — trending / live engagement accent
// brass:  #C9A227  — reward / elite tier accent
// line:   #E4DFD6  — hairline borders on paper
// ---------------------------------------------------------------

const T = {
  ink: "#0A0F1A",       // near-black deep space — primary dark surface
  paper: "#F4F7FA",     // cool white-blue — light surface / background
  navy: "#0E2A44",      // deep tech navy — brand anchor
  navy2: "#163A5C",     // secondary navy
  signal: "#00CFFF",    // electric cyan — primary action / trending / AI accent
  brass: "#5B9EFF",     // bright tech blue — replaces gold for "premium/reward"
  line: "#DCE4ED",      // hairline borders on light/paper surfaces (cards, inputs)
  inkLine: "#1C2940",   // hairline borders on dark surfaces
  sub: "#7B8AA0",       // secondary text — cool grey-blue
  glow: "#00CFFF",      // glow accents (shadows, halos)
  // UAE flag colors — used as deliberate national-pride accents
  // (verification badges, "Made for the UAE" moments, flag stripe)
  uaeRed: "#CE1126",
  uaeGreen: "#00843D",
  uaeWhite: "#FFFFFF",
  uaeBlack: "#000000",
};

// Reusable UAE flag accent stripe — a proud, deliberate touch used
// near verification/trust moments and platform footers.
function UAEFlagStripe({ height = 4, rounded = true }) {
  return (
    <div
      className={rounded ? "rounded-full overflow-hidden flex" : "overflow-hidden flex"}
      style={{ height, width: "100%" }}
    >
      <div style={{ flex: 1, background: T.uaeRed }} />
      <div style={{ flex: 1, background: T.uaeGreen }} />
      <div style={{ flex: 1, background: T.uaeWhite }} />
      <div style={{ flex: 1, background: T.uaeBlack }} />
    </div>
  );
}

const FONT_IMPORT = `
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap');

@keyframes tabFadeIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.tab-fade {
  animation: tabFadeIn 0.28s ease-out;
}

@keyframes swipeHint {
  0%, 100% { transform: translateY(0); opacity: 0.7; }
  50% { transform: translateY(-8px); opacity: 1; }
}

@keyframes orbScroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}

@keyframes aiBreathe {
  0%, 100% { transform: scale(1); box-shadow: 0 0 40px 10px rgba(255,90,54,0.25); }
  50% { transform: scale(1.06); box-shadow: 0 0 60px 18px rgba(201,162,39,0.35); }
}
@keyframes aiBlink {
  0%, 92%, 100% { transform: scaleY(1); }
  96% { transform: scaleY(0.1); }
}
@keyframes aiFadeOut {
  from { opacity: 1; }
  to { opacity: 0; visibility: hidden; }
}

@keyframes logoSpin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes logoPulse {
  0%, 100% { opacity: 0.55; transform: scale(0.9); }
  50% { opacity: 1; transform: scale(1.15); }
}

@keyframes balloonFloat {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-10px) rotate(1.5deg); }
}

@keyframes balloonDrift {
  0% { transform: translateY(0) translateX(0); }
  50% { transform: translateY(-16px) translateX(6px); }
  100% { transform: translateY(0) translateX(0); }
}

@keyframes neuralPulse {
  0%,100% { opacity:.3; }
  50% { opacity:1; }
}
@keyframes circuitFlow {
  0% { stroke-dashoffset:200; opacity:.2; }
  50% { opacity:.9; }
  100% { stroke-dashoffset:0; opacity:.2; }
}
@keyframes eyeGlow {
  0%,100% { filter:drop-shadow(0 0 4px #00CFFF) drop-shadow(0 0 12px #006EFF); }
  50% { filter:drop-shadow(0 0 10px #00CFFF) drop-shadow(0 0 28px #006EFF) drop-shadow(0 0 48px #0044CC); }
}
@keyframes scanLine {
  0% { transform:translateY(-100%); opacity:0; }
  10% { opacity:.5; }
  90% { opacity:.5; }
  100% { transform:translateY(380px); opacity:0; }
}
@keyframes logoOrbit {
  from { transform:rotate(0deg); }
  to { transform:rotate(360deg); }
}
@keyframes logoCoreGlow {
  0%,100% { filter:drop-shadow(0 0 4px #00CFFF); }
  50% { filter:drop-shadow(0 0 14px #00CFFF) drop-shadow(0 0 28px #006EFF); }
}
@keyframes dataScroll {
  from { transform:translateY(0); }
  to { transform:translateY(-50%); }
}
`;

// ---------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------

const PROPERTIES = [
  {
    id: "p1",
    sustainabilityScore: 88,
    urbanCenter: "marina",
    sustainabilityFactors: { greenBuilding: true, smartHome: true, solarReady: true, districtCooling: true, wasteRecycling: false },
    title: "Sky-line 2BR in Marina Gate",
    type: "Sale",
    category: "Apartment",
    price: 2450000,
    area: "Dubai Marina",
    emirate: "Dubai",
    beds: 2,
    baths: 2,
    sqft: 1180,
    views: 4820,
    trending: true,
    promoted: true,
    visibility: "public",
    listedAs: "LICENSED_BROKER",
    status: "active",
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 1180, investor: 840, buyer: 2800 },
    listingChain: [
      { order: 1, name: "Lina Haddad — Marina Prime Realty", date: "2 months ago" },
      { order: 2, name: "Omar Al Suwaidi — Reem Capital Homes", date: "3 weeks ago" },
    ],
    grad: ["#3A6FA0", "#1F3D5C"],
  },
  {
    id: "p2",
    sustainabilityScore: 45,
    urbanCenter: "expo",
    sustainabilityFactors: { greenBuilding: false, smartHome: false, solarReady: false, districtCooling: false, wasteRecycling: false },
    title: "Garden Townhouse, Phase 3",
    type: "Sale",
    category: "Townhouse",
    price: 3100000,
    area: "Arabian Ranches",
    emirate: "Dubai",
    beds: 4,
    baths: 4,
    sqft: 2860,
    views: 1290,
    trending: false,
    promoted: false,
    visibility: "public",
    listedAs: "OWNER_LISTING",
    status: "rented",
    rentedUntil: "Dec 2026",
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 310, investor: 180, buyer: 800 },
    listingChain: [{ order: 1, name: "Marc Dubois — Coastline Estates", date: "5 months ago" }],
    grad: ["#7C8B6F", "#3F4A37"],
  },
  {
    id: "p3",
    sustainabilityScore: 72,
    urbanCenter: "downtown",
    sustainabilityFactors: { greenBuilding: true, smartHome: true, solarReady: false, districtCooling: true, wasteRecycling: false },
    title: "Studio w/ Canal View",
    type: "Rent",
    category: "Apartment",
    price: 78000,
    priceFreq: "yr",
    area: "Business Bay",
    emirate: "Dubai",
    beds: 0,
    baths: 1,
    sqft: 480,
    views: 3110,
    trending: true,
    promoted: false,
    visibility: "public",
    listedAs: "REFERRAL_PARTNER",
    status: "active",
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 540, investor: 270, buyer: 2300 },
    listingChain: [{ order: 1, name: "Priya Nair — Bay Realty Group", date: "1 week ago" }],
    grad: ["#C9A227", "#8A6E1B"],
  },
  {
    id: "p4",
    sustainabilityScore: 91,
    urbanCenter: "creek",
    sustainabilityFactors: { greenBuilding: true, smartHome: true, solarReady: true, districtCooling: true, wasteRecycling: true },
    title: "Off-plan Tower — Reem Island",
    type: "Sale",
    category: "Apartment",
    price: 1850000,
    area: "Al Reem Island",
    emirate: "Abu Dhabi",
    beds: 1,
    baths: 1,
    sqft: 760,
    views: 612,
    trending: false,
    promoted: true,
    visibility: "investor",
    listedAs: "DEVELOPER",
    status: "active",
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 90, investor: 480, buyer: 42 },
    listingChain: [{ order: 1, name: "Reem Capital Homes (Developer)", date: "Pre-launch" }],
    grad: ["#2C5278", "#14191F"],
  },
  {
    id: "p5",
    sustainabilityScore: 30,
    urbanCenter: "dxb-center",
    sustainabilityFactors: { greenBuilding: false, smartHome: false, solarReady: false, districtCooling: false, wasteRecycling: false },
    title: "Bulk Deal — 12 Units, Yas Bay",
    type: "Sale",
    category: "Building",
    price: 42000000,
    area: "Yas Island",
    emirate: "Abu Dhabi",
    beds: null,
    baths: null,
    sqft: 18400,
    views: 240,
    trending: false,
    promoted: false,
    visibility: "investor",
    listedAs: "LICENSED_BROKER",
    status: "active",
    distressed: true,
    distressReason: "Seller needs liquidity within 30 days — priced 18% below market",
    isNew: false,
    viewsByRole: { agent: 60, investor: 170, buyer: 10 },
    listingChain: [{ order: 1, name: "Marco Rossi — Coastline Estates", date: "4 days ago" }],
    grad: ["#FF5A36", "#8A2E18"],
  },
  {
    id: "p6",
    sustainabilityScore: 55,
    urbanCenter: "expo",
    sustainabilityFactors: { greenBuilding: false, smartHome: true, solarReady: true, districtCooling: false, wasteRecycling: false },
    title: "Hillside Villa, Tilal City",
    type: "Sale",
    category: "Villa",
    price: 4600000,
    area: "Tilal City",
    emirate: "Sharjah",
    beds: 5,
    baths: 6,
    sqft: 5200,
    views: 990,
    trending: false,
    promoted: false,
    visibility: "public",
    listedAs: "OWNER_LISTING",
    status: "sold",
    soldPrice: 4450000,
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 210, investor: 140, buyer: 640 },
    listingChain: [{ order: 1, name: "Yousef K. — Skyline Properties", date: "6 months ago" }],
    grad: ["#6F8C8B", "#2E3D3C"],
  },
  {
    id: "p7",
    sustainabilityScore: 40,
    urbanCenter: "expo",
    sustainabilityFactors: { greenBuilding: false, smartHome: false, solarReady: false, districtCooling: false, wasteRecycling: false },
    title: "Residential Plot G+2, Al Furjan",
    type: "Sale",
    category: "Land",
    price: 5200000,
    area: "Al Furjan",
    emirate: "Dubai",
    beds: null,
    baths: null,
    sqft: 9000,
    views: 410,
    trending: false,
    promoted: false,
    visibility: "public",
    listedAs: "OWNER_LISTING",
    status: "active",
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 120, investor: 210, buyer: 80 },
    listingChain: [{ order: 1, name: "Khalid Al Mansoori", date: "2 weeks ago" }],
    grad: ["#8A8268", "#3F3A2C"],
  },
  {
    id: "p8",
    sustainabilityScore: 25,
    urbanCenter: "dxb-center",
    sustainabilityFactors: { greenBuilding: false, smartHome: false, solarReady: false, districtCooling: false, wasteRecycling: false },
    title: "Distressed Retail Unit, Deira",
    type: "Sale",
    category: "Retail",
    price: 1450000,
    area: "Deira",
    emirate: "Dubai",
    beds: null,
    baths: 1,
    sqft: 1100,
    views: 305,
    trending: false,
    promoted: false,
    visibility: "public",
    listedAs: "LICENSED_BROKER",
    status: "active",
    distressed: true,
    distressReason: "Vacant since lease ended — owner relocating abroad, motivated to close quickly",
    isNew: false,
    viewsByRole: { agent: 80, investor: 195, buyer: 30 },
    listingChain: [{ order: 1, name: "Sarah Mitchell — Bay Realty Group", date: "3 days ago" }],
    grad: ["#5A6B7A", "#23303B"],
  },
  {
    id: "p9",
    sustainabilityScore: 95,
    urbanCenter: "creek",
    sustainabilityFactors: { greenBuilding: true, smartHome: true, solarReady: true, districtCooling: true, wasteRecycling: true },
    title: "Boutique Beachfront Resort, RAK",
    type: "Sale",
    category: "Hotel",
    price: 86000000,
    area: "Al Marjan Island",
    emirate: "Ras Al Khaimah",
    beds: null,
    baths: null,
    sqft: 64000,
    views: 145,
    trending: false,
    promoted: true,
    visibility: "investor",
    listedAs: "DEVELOPER",
    status: "active",
    distressed: false,
    isNew: false,
    viewsByRole: { agent: 20, investor: 120, buyer: 5 },
    listingChain: [{ order: 1, name: "RAK Hospitality Holdings (Developer)", date: "Off-market" }],
    grad: ["#1F3D5C", "#0E1A26"],
  },
];

const VIEW_HISTORY = [
  { day: "Mon", views: 410 },
  { day: "Tue", views: 530 },
  { day: "Wed", views: 480 },
  { day: "Thu", views: 690 },
  { day: "Fri", views: 1020 },
  { day: "Sat", views: 1380 },
  { day: "Sun", views: 1640 },
];

// ---------------------------------------------------------------
// DUBAI 2040 URBAN MASTER PLAN — five urban centers framework
// Used to tag listings by which 2040 urban center they fall under,
// and to power the "Vision 2040" smart/sustainable discovery layer.
// ---------------------------------------------------------------
const URBAN_CENTERS_2040 = [
  { id: "dxb-center", name: "Deira & Bur Dubai", role: "Heritage & Culture", icon: Globe2, grad: ["#C9A227", "#6A520F"] },
  { id: "downtown",   name: "Downtown & Business Bay", role: "Business Center", icon: Building2, grad: ["#2C5278", "#0E1A26"] },
  { id: "marina",     name: "Dubai Marina & JBR", role: "Waterfront Living", icon: Wind, grad: ["#1A7AA0", "#0B3850"] },
  { id: "expo",       name: "Expo City & Dubai South", role: "Innovation District", icon: Cpu, grad: ["#7C3FA0", "#3A1A50"] },
  { id: "creek",      name: "Dubai Creek Harbour", role: "Future Urban Center", icon: Sun, grad: ["#FF5A36", "#8A2E18"] },
];

const SUSTAINABILITY_FACTORS = [
  { key: "greenBuilding", label: "Green building certified", icon: Leaf },
  { key: "smartHome", label: "Smart home / IoT enabled", icon: Cpu },
  { key: "solarReady", label: "Solar-ready / energy efficient", icon: Sun },
  { key: "districtCooling", label: "District cooling network", icon: Wind },
  { key: "wasteRecycling", label: "Waste recycling on-site", icon: Recycle },
];

const DISCOVERY_ORBS = [
  {
    id: "forYou",
    label: "For You",
    icon: Sparkles,
    grad: ["#FF5A36", "#C9A227"],
    headline: "For you",
    sub: "A mix curated from what's trending and newly listed across the UAE.",
  },
  {
    id: "trending",
    label: "Trending",
    icon: Flame,
    grad: ["#FF5A36", "#8A2E18"],
    headline: "Trending now",
    sub: "Listings getting the most attention on Junction right now.",
    filter: (p) => p.trending,
  },
  {
    id: "land",
    label: "Land & Plots",
    icon: Maximize,
    grad: ["#8A8268", "#3F3A2C"],
    headline: "Land & plots",
    sub: "Residential and commercial plots across the Emirates.",
    filter: (p) => p.category === "Land",
  },
  {
    id: "distress",
    label: "Distress deals",
    icon: AlertTriangle,
    grad: ["#B23A2E", "#5A1F18"],
    headline: "Distress deals",
    sub: "Time-sensitive opportunities, priced for a fast close.",
    filter: (p) => p.distressed,
  },
  {
    id: "commercial",
    label: "Commercial",
    icon: Building2,
    grad: ["#2C5278", "#14191F"],
    headline: "Commercial",
    sub: "Offices, retail units, warehouses and buildings.",
    filter: (p) => ["Office", "Retail", "Warehouse", "Building"].includes(p.category),
  },
  {
    id: "newToday",
    label: "New today",
    icon: Zap,
    grad: ["#C9A227", "#8A6E1B"],
    headline: "New on Junction",
    sub: "Just listed by the community.",
    filter: (p) => p.isNew,
  },
  {
    id: "vision2040",
    label: "Vision 2040",
    icon: Leaf,
    grad: ["#1F8A5C", "#0C3D28"],
    headline: "Vision 2040 · Sustainable & Smart",
    sub: "Listings aligned with Dubai 2040's green building, IoT, and smart-living standards.",
    filter: (p) => p.sustainabilityScore >= 70,
  },
  {
    id: "search",
    label: "Search",
    icon: Search,
    grad: ["#6F8C8B", "#2E3D3C"],
    headline: "Search",
    sub: "Find listings by title or area.",
  },
];

const SERVICE_CATEGORIES = [
  "Carpenter",
  "Plumber",
  "Electrician",
  "AC Technician",
  "Painter",
  "Mover",
  "Cleaner",
  "Handyman",
  "Pool Maintenance",
  "Interior Designer",
  "Smart Home Installer",
  "Solar & Energy Audit",
];

const SERVICE_PROVIDERS = [
  {
    id: "s1",
    name: "Faisal Ahmed",
    category: "Carpenter",
    emirate: "Dubai",
    area: "Al Quoz",
    rating: 4.8,
    jobsCompleted: 312,
    online: true,
    rate: "AED 120/hr",
    grad: ["#7C8B6F", "#3F4A37"],
  },
  {
    id: "s2",
    name: "Rashid Plumbing Services",
    category: "Plumber",
    emirate: "Dubai",
    area: "Al Barsha",
    rating: 4.6,
    jobsCompleted: 540,
    online: true,
    rate: "AED 90/hr",
    grad: ["#2C5278", "#14191F"],
  },
  {
    id: "s3",
    name: "Bright Spark Electric",
    category: "Electrician",
    emirate: "Abu Dhabi",
    area: "Mussafah",
    rating: 4.9,
    jobsCompleted: 218,
    online: false,
    rate: "AED 110/hr",
    grad: ["#C9A227", "#8A6E1B"],
  },
  {
    id: "s4",
    name: "Cool Breeze AC Maintenance",
    category: "AC Technician",
    emirate: "Sharjah",
    area: "Al Nahda",
    rating: 4.7,
    jobsCompleted: 489,
    online: true,
    rate: "AED 150/job",
    grad: ["#6F8C8B", "#2E3D3C"],
  },
  {
    id: "s5",
    name: "Elite Interiors Studio",
    category: "Interior Designer",
    emirate: "Dubai",
    area: "Business Bay",
    rating: 5.0,
    jobsCompleted: 76,
    online: true,
    rate: "From AED 8,000",
    grad: ["#FF5A36", "#8A2E18"],
  },
];

const LEADERBOARD = [
  { rank: 1, name: "Lina Haddad", agency: "Marina Prime Realty", score: 9840, tier: "ELITE" },
  { rank: 2, name: "Omar Al Suwaidi", agency: "Reem Capital Homes", score: 8120, tier: "TOP" },
  { rank: 3, name: "You — Yousef K.", agency: "Skyline Properties", score: 7430, tier: "TOP", you: true },
  { rank: 4, name: "Priya Nair", agency: "Bay Realty Group", score: 6210, tier: "RISING" },
  { rank: 5, name: "Marco Rossi", agency: "Coastline Estates", score: 5890, tier: "RISING" },
];

const BANK_PARTNERS = [
  {
    name: "Emirates NBD",
    grad: ["#1F3D5C", "#0E1A26"],
    services: ["Mortgage pre-approval", "Construction finance", "Escrow accounts"],
  },
  {
    name: "ADCB",
    grad: ["#2C5278", "#14191F"],
    services: ["Home finance", "Developer project financing"],
  },
  {
    name: "Mashreq",
    grad: ["#C9A227", "#8A6E1B"],
    services: ["Mortgage pre-approval", "Investor banking"],
  },
  {
    name: "Dubai Islamic Bank",
    grad: ["#7C8B6F", "#3F4A37"],
    services: ["Ijara home finance", "Escrow accounts"],
  },
];

const TRANSACTIONS = [
  {
    id: "t1",
    date: "12 Jun 2026",
    type: "Promotion",
    item: "Featured boost — Sky-line 2BR in Marina Gate",
    amount: 350,
    status: "Completed",
    dldRef: null,
  },
  {
    id: "t2",
    date: "9 Jun 2026",
    type: "Sale closed",
    item: "Hillside Villa, Tilal City",
    amount: 4450000,
    status: "Completed",
    dldRef: "DLD-2026-114829",
  },
  {
    id: "t3",
    date: "3 Jun 2026",
    type: "Promotion",
    item: "Investor Reach — Off-plan Tower, Reem Island",
    amount: 900,
    status: "Completed",
    dldRef: null,
  },
  {
    id: "t4",
    date: "30 May 2026",
    type: "Service booking",
    item: "AC servicing — Cool Breeze AC Maintenance",
    amount: 150,
    status: "Pending",
    dldRef: null,
  },
];

const LISTER_TYPE_STYLE = {
  OWNER_LISTING: { label: "Owner listing", color: T.navy2 },
  REFERRAL_PARTNER: { label: "Referral partner", color: "#8A6E1B" },
  LICENSED_BROKER: { label: "Licensed broker", color: T.signal },
  DEVELOPER: { label: "Verified developer", color: T.ink },
};

const VERIFICATION_TIERS = [
  {
    type: "EMIRATES_ID",
    title: "Emirates ID",
    subtitle: "Anyone can verify",
    icon: CreditCard,
    unlocks: [
      "List property you own",
      "Refer leads for a finder's fee",
      "Chat with agents, buyers & investors",
    ],
  },
  {
    type: "RERA_BROKER",
    title: "RERA / DLD broker card",
    subtitle: "For licensed agents (Dubai)",
    icon: FileCheck2,
    unlocks: [
      "Represent third-party listings",
      "Appear on the agent leaderboard & rewards",
      "Access paid promotions (Featured, Investor Reach)",
    ],
  },
  {
    type: "OTHER_EMIRATE_LICENSE",
    title: "Other emirate license",
    subtitle: "Abu Dhabi, Sharjah & others",
    icon: FileCheck2,
    unlocks: [
      "Same as RERA tier, scoped to your emirate",
    ],
  },
  {
    type: "TRADE_LICENSE",
    title: "Company / developer trade license",
    subtitle: "For developer accounts",
    icon: Building2,
    unlocks: [
      "Post bulk & off-plan into the Investor Zone",
      "Company profile page",
      "Direct chat channel with verified investors",
    ],
  },
];

const TIER_STYLE = {
  ELITE: { color: T.brass, label: "Elite" },
  TOP: { color: T.signal, label: "Top" },
  RISING: { color: T.navy2, label: "Rising" },
  STANDARD: { color: T.sub, label: "Standard" },
};

const CHAT_THREADS = [
  {
    id: "c1",
    name: "Sarah Mitchell",
    role: "Buyer",
    property: "Sky-line 2BR in Marina Gate",
    online: true,
    messages: [
      { from: "them", text: "Hi, is the Marina Gate unit still available?" },
      { from: "me", text: "Yes! Available for viewing this week." },
      { from: "them", text: "Great — could we do Thursday at 5pm?" },
    ],
  },
  {
    id: "c2",
    name: "Reem Capital Homes",
    role: "Developer",
    property: "Off-plan Tower — Reem Island",
    online: true,
    messages: [
      { from: "them", text: "We have 3 new units released on floor 22-24." },
      { from: "me", text: "Send me the floor plans, I have an investor interested." },
    ],
  },
  {
    id: "c3",
    name: "Khalid Investments LLC",
    role: "Investor",
    property: "Bulk Deal — 12 Units, Yas Bay",
    online: false,
    messages: [
      { from: "them", text: "What's the projected yield on the Yas Bay package?" },
    ],
  },
  {
    id: "c4",
    name: "Marc Dubois",
    role: "Agent",
    property: "Hillside Villa, Tilal City",
    online: false,
    messages: [
      { from: "them", text: "I can arrange a viewing for the Tilal City villa anytime this week." },
    ],
  },
];

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

const fmtAED = (n) =>
  new Intl.NumberFormat("en-AE", { maximumFractionDigits: 0 }).format(n);

const fmtViews = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`);

const AVATAR_PALETTE = [
  ["#FF5A36", "#C9A227"],
  ["#2C5278", "#14191F"],
  ["#7C8B6F", "#3F4A37"],
  ["#6F8C8B", "#2E3D3C"],
];

function Avatar({ name, size = 32 }) {
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  const palette = AVATAR_PALETTE[name.length % AVATAR_PALETTE.length];
  return (
    <div
      className="rounded-full flex items-center justify-center shrink-0 font-semibold text-white"
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${size * 0.36}px`,
        background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]})`,
        fontFamily: "'Space Grotesk', sans-serif",
      }}
    >
      {initials}
    </div>
  );
}


// ---------------------------------------------------------------
// Live pulse hook — simulates real-time view increments
// ---------------------------------------------------------------

function useLiveViews(initial) {
  const [views, setViews] = useState(initial);
  useEffect(() => {
    const id = setInterval(() => {
      setViews((prev) => {
        const next = {};
        Object.entries(prev).forEach(([k, v]) => {
          const bump = Math.random() < 0.5 ? 0 : Math.floor(Math.random() * 4);
          next[k] = v + bump;
        });
        return next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, []);
  return views;
}

// ---------------------------------------------------------------
// Components
// ---------------------------------------------------------------

function Logo({ light }) {
  return (
    <div className="flex items-center gap-2">
      <JunctionLogoMark size={30} glow={light} />
      <span
        style={{
          fontFamily: "'Space Grotesk', sans-serif",
          color: light ? "#00CFFF" : T.ink,
          letterSpacing: ".04em",
          textShadow: light ? "0 0 14px #00CFFF66" : "none",
          fontWeight: 700,
        }}
        className="text-lg"
      >
        JUNCTION
      </span>
    </div>
  );
}

function PropertyCard({ p, liveViews }) {
  const isInvestor = p.visibility === "investor";
  const views = liveViews[p.id] ?? p.views;
  return (
    <div
      className="rounded-xl overflow-hidden border flex flex-col"
      style={{ borderColor: T.line, background: "#fff" }}
    >
      <div
        className="h-36 relative flex items-end p-3"
        style={{
          background: `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`,
        }}
      >
        <div className="flex gap-1.5 absolute top-3 left-3">
          {p.promoted && (
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: T.brass, color: T.ink }}
            >
              <Zap size={12} /> Promoted
            </span>
          )}
          {p.trending && (
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: T.signal, color: "#fff" }}
            >
              <Flame size={12} /> Trending
            </span>
          )}
          {isInvestor && (
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: T.ink, color: T.paper }}
            >
              <Lock size={12} /> Off-market
            </span>
          )}
          {p.distressed && (
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: "#fff", color: "#B23A2E" }}
            >
              <AlertTriangle size={12} /> Distress deal
            </span>
          )}
          {p.sustainabilityScore >= 70 && (
            <span
              className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
              style={{ background: "#1F8A5C", color: "#fff" }}
            >
              <Leaf size={12} /> Vision 2040
            </span>
          )}
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}
        >
          {p.type} · {p.category}
        </span>
        <span
          className="text-[10px] font-semibold px-2 py-1 rounded-full absolute top-3 right-3"
          style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}
        >
          {LISTER_TYPE_STYLE[p.listedAs]?.label}
        </span>
      </div>

      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <div
          style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }}
          className="text-base font-semibold"
        >
          AED {fmtAED(p.price)}
          {p.priceFreq && <span className="text-xs font-normal" style={{ color: T.sub }}> / {p.priceFreq}</span>}
        </div>
        <div className="text-sm font-medium" style={{ color: T.ink }}>
          {p.title}
        </div>

        {p.status === "rented" && p.rentedUntil && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1 self-start" style={{ background: "#FDF3E2", color: "#9A6B17" }}>
            <Clock size={11} /> Rented until {p.rentedUntil}
          </span>
        )}
        {p.status === "sold" && p.soldPrice && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-md inline-flex items-center gap-1 self-start" style={{ background: "#E9F4EE", color: "#1F7A4D" }}>
            <CheckCircle2 size={11} /> Sold — AED {fmtAED(p.soldPrice)}
          </span>
        )}
        {p.distressed && p.distressReason && (
          <div className="text-[11px] px-2 py-1.5 rounded-md" style={{ background: "#FDEDEA", color: "#B23A2E" }}>
            {p.distressReason}
          </div>
        )}

        <div className="flex items-center gap-1 text-xs" style={{ color: T.sub }}>
          <MapPin size={12} /> {p.area}, {p.emirate}
        </div>

        {p.urbanCenter && (
          <div className="flex items-center gap-1 text-[11px]" style={{ color: "#1F8A5C" }}>
            <Globe2 size={11} />
            {URBAN_CENTERS_2040.find((u) => u.id === p.urbanCenter)?.name} · {URBAN_CENTERS_2040.find((u) => u.id === p.urbanCenter)?.role}
          </div>
        )}

        {typeof p.sustainabilityScore === "number" && (
          <div className="flex items-center gap-2">
            <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ background: T.line }}>
              <div
                className="h-full rounded-full"
                style={{
                  width: `${p.sustainabilityScore}%`,
                  background: p.sustainabilityScore >= 70 ? "#1F8A5C" : p.sustainabilityScore >= 40 ? "#C9A227" : "#B23A2E",
                }}
              />
            </div>
            <span className="text-[10px] font-semibold" style={{ color: T.sub }}>
              {p.sustainabilityScore}/100
            </span>
          </div>
        )}

        <div className="flex items-center gap-3 text-xs mt-1" style={{ color: T.sub }}>
          {p.beds !== null && (
            <span className="flex items-center gap-1"><BedDouble size={13} /> {p.beds}</span>
          )}
          {p.baths !== null && (
            <span className="flex items-center gap-1"><Bath size={13} /> {p.baths}</span>
          )}
          <span className="flex items-center gap-1"><Maximize size={13} /> {p.sqft.toLocaleString()} sqft</span>
        </div>

        <div className="flex items-center justify-between mt-auto pt-2 border-t" style={{ borderColor: T.line }}>
          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: p.trending ? T.signal : T.sub }}>
            <Eye size={13} /> {fmtViews(views)} views
          </span>
          <button
            className="text-xs font-semibold flex items-center gap-1"
            style={{ color: T.navy }}
          >
            View details <ChevronRight size={14} />
          </button>
        </div>
        {p.listingChain?.length > 0 && (
          <div className="text-[11px] flex items-center gap-1" style={{ color: T.sub }}>
            <Users size={11} />
            First listed by {p.listingChain[0].name.split(" — ")[0]}
            {p.listingChain.length > 1 && ` · also listed by ${p.listingChain.length - 1} other agent${p.listingChain.length - 1 > 1 ? "s" : ""}`}
          </div>
        )}
      </div>
    </div>
  );
}

function DiscoveryOrbs({ activeOrb, onSelect, paused }) {
  const orbs = [...DISCOVERY_ORBS, ...DISCOVERY_ORBS]; // doubled for seamless loop
  return (
    <div className="overflow-hidden -mx-4 md:-mx-6 px-4 md:px-6 mb-1">
      <div
        className="flex gap-4 py-2"
        style={{
          animation: "orbScroll 32s linear infinite",
          animationPlayState: paused ? "paused" : "running",
          width: "max-content",
        }}
      >
        {orbs.map((o, i) => {
          const Icon = o.icon;
          const active = activeOrb === o.id;
          return (
            <button
              key={`${o.id}-${i}`}
              onClick={() => onSelect(o.id)}
              className="flex flex-col items-center gap-1.5 shrink-0"
              style={{ width: "64px" }}
            >
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: "56px",
                  height: "56px",
                  background: `linear-gradient(135deg, ${o.grad[0]}, ${o.grad[1]})`,
                  transform: active ? "scale(1.14)" : "scale(1)",
                  boxShadow: active ? `0 0 0 3px ${T.paper}, 0 0 0 5px ${o.grad[0]}` : "none",
                  transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1), box-shadow 0.25s",
                }}
              >
                <Icon size={22} color="#fff" />
              </div>
              <span className="text-[11px] font-medium text-center leading-tight" style={{ color: active ? T.ink : T.sub }}>
                {o.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PropertyBalloon({ p, views, expanded, onClick, index }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full flex flex-col items-center justify-center text-center shrink-0 relative"
      style={{
        width: "132px",
        height: "132px",
        background: `linear-gradient(135deg, ${p.grad[0]}, ${p.grad[1]})`,
        boxShadow: expanded ? `0 10px 24px rgba(0,0,0,0.18), 0 0 0 3px ${T.brass}` : "0 8px 16px rgba(0,0,0,0.12)",
        animation: expanded ? "none" : `balloonFloat ${4 + (index % 3)}s ease-in-out ${(index % 5) * 0.25}s infinite`,
        transition: "box-shadow 0.2s",
      }}
    >
      {p.distressed && (
        <span className="absolute top-1 left-1.5"><AlertTriangle size={14} color="#fff" /></span>
      )}
      {p.trending && (
        <span className="absolute top-1 right-1.5"><Flame size={14} color="#fff" /></span>
      )}
      <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#fff" }} className="text-sm font-semibold px-2">
        {fmtAED(p.price)}
        {p.priceFreq && <span className="text-[10px]">/{p.priceFreq}</span>}
      </span>
      <span className="text-[10px] text-white px-3 mt-1 leading-tight" style={{ opacity: 0.9 }}>
        {p.area}
      </span>
      <span className="text-[10px] text-white mt-1 flex items-center gap-0.5" style={{ opacity: 0.85 }}>
        <Eye size={10} /> {fmtViews(views)}
      </span>
    </button>
  );
}

function AdBanner() {
  return (
    <div
      className="rounded-xl p-4 flex items-center gap-3 mt-3"
      style={{ background: `linear-gradient(135deg, ${T.brass}, ${T.signal})` }}
    >
      <div className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.2)" }}>
        <Building2 size={20} color="#fff" />
      </div>
      <div className="flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.85)" }}>
          Sponsored
        </div>
        <div className="text-sm font-semibold text-white">Rönesans Holding — new master plan launching in Dubai South</div>
      </div>
      <ChevronRight size={18} color="#fff" />
    </div>
  );
}

function FeedView({ liveViews, properties }) {
  const [activeOrb, setActiveOrb] = useState("forYou");
  const [paused, setPaused] = useState(false);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const orb = DISCOVERY_ORBS.find((o) => o.id === activeOrb) || DISCOVERY_ORBS[0];

  const handleSelect = (id) => {
    setActiveOrb((prev) => (prev === id ? "forYou" : id));
    setPaused(true);
    setExpandedId(null);
  };

  const list = useMemo(() => {
    let base = properties.filter((p) => p.visibility !== "investor");
    if (activeOrb === "search") {
      if (query.trim()) {
        const q = query.trim().toLowerCase();
        base = base.filter((p) => p.title.toLowerCase().includes(q) || p.area.toLowerCase().includes(q) || p.emirate.toLowerCase().includes(q));
      }
      return base;
    }
    if (orb.filter) base = base.filter(orb.filter);
    if (activeOrb === "forYou") {
      // curated mix: trending & promoted first, then the rest
      base = [...base].sort((a, b) => (b.trending - a.trending) || (b.promoted - a.promoted) || (b.views - a.views));
    }
    return base;
  }, [activeOrb, properties, query, orb]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-3">
        <h1
          style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }}
          className="text-2xl font-semibold"
        >
          Junction
        </h1>
        <p className="text-sm mt-1" style={{ color: T.sub }}>
          Tap a circle to explore — or just watch them roll by.
        </p>
      </div>

      <DiscoveryOrbs activeOrb={activeOrb} onSelect={handleSelect} paused={paused} />

      {activeOrb === "forYou" && <AdBanner />}

      {activeOrb === "search" && (
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg border mt-2 mb-1"
          style={{ borderColor: T.line, background: "#fff" }}
        >
          <Search size={16} style={{ color: T.sub }} />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by title, area, or emirate…"
            className="text-sm outline-none flex-1 bg-transparent"
            style={{ color: T.ink }}
          />
        </div>
      )}

      <div key={activeOrb} className="tab-fade mt-3 mb-3">
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold">
          {orb.headline}
        </div>
        <p className="text-xs mt-0.5" style={{ color: T.sub }}>{orb.sub}</p>
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-center py-10" style={{ color: T.sub }}>
          Nothing here yet — try another circle.
        </div>
      ) : (
        <div key={`${activeOrb}-list`} className="tab-fade">
          <div className="flex flex-wrap gap-4 justify-center py-2">
            {list.map((p, i) => (
              <PropertyBalloon
                key={p.id}
                p={p}
                index={i}
                views={liveViews[p.id] ?? p.views}
                expanded={expandedId === p.id}
                onClick={() => setExpandedId((cur) => (cur === p.id ? null : p.id))}
              />
            ))}
          </div>
          {expandedId && list.find((p) => p.id === expandedId) && (
            <div key={expandedId} className="tab-fade max-w-sm mx-auto mt-2">
              <PropertyCard p={list.find((p) => p.id === expandedId)} liveViews={liveViews} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// VISION 2040 — Dubai Urban Master Plan alignment view
// Maps Junction listings to the 5 urban centers + sustainability
// scoring framework from the Dubai 2040 Urban Master Plan.
// ---------------------------------------------------------------
function Vision2040View({ properties, liveViews }) {
  const [activeCenter, setActiveCenter] = useState(null);

  const centerProperties = (centerId) =>
    properties.filter((p) => p.urbanCenter === centerId && p.visibility !== "investor");

  const avgScore = Math.round(
    properties.reduce((sum, p) => sum + (p.sustainabilityScore || 0), 0) / properties.length
  );

  return (
    <div className="p-4 md:p-6">
      <div
        className="rounded-2xl p-5 mb-5 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0C3D28, #071828)" }}
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle, #1F8A5C 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Leaf size={20} color="#3FD08C" />
            <span className="text-[11px] font-semibold tracking-wide uppercase" style={{ color: "#3FD08C" }}>
              Dubai 2040 Urban Master Plan
            </span>
          </div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#fff" }} className="text-2xl font-semibold mb-2">
            Vision 2040 on Junction
          </h1>
          <p className="text-sm max-w-lg" style={{ color: "#9FC9B5" }}>
            Junction tags every listing against Dubai's 20-year master plan — five urban centers,
            green building standards, and smart-city readiness — so investors and buyers can find
            property aligned with where Dubai is heading.
          </p>
          <div className="flex items-center gap-4 mt-4">
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#fff" }} className="text-2xl font-semibold">
                {avgScore}<span className="text-sm font-normal" style={{ color: "#9FC9B5" }}>/100</span>
              </div>
              <div className="text-[11px]" style={{ color: "#9FC9B5" }}>Avg. sustainability score</div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#fff" }} className="text-2xl font-semibold">
                {properties.filter((p) => p.sustainabilityScore >= 70).length}
              </div>
              <div className="text-[11px]" style={{ color: "#9FC9B5" }}>Vision 2040 listings</div>
            </div>
            <div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: "#fff" }} className="text-2xl font-semibold">5</div>
              <div className="text-[11px]" style={{ color: "#9FC9B5" }}>Urban centers tracked</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold mb-3">
        The five urban centers
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mb-5">
        {URBAN_CENTERS_2040.map((center) => {
          const Icon = center.icon;
          const count = centerProperties(center.id).length;
          const active = activeCenter === center.id;
          return (
            <button
              key={center.id}
              onClick={() => setActiveCenter((cur) => (cur === center.id ? null : center.id))}
              className="rounded-xl p-4 text-left flex flex-col gap-2"
              style={{
                background: `linear-gradient(135deg, ${center.grad[0]}, ${center.grad[1]})`,
                boxShadow: active ? "0 0 0 3px #1F8A5C" : "none",
              }}
            >
              <Icon size={20} color="#fff" />
              <div className="text-sm font-semibold text-white">{center.name}</div>
              <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.8)" }}>{center.role}</div>
              <div className="text-[11px] font-semibold mt-1" style={{ color: "rgba(255,255,255,0.9)" }}>
                {count} listing{count !== 1 ? "s" : ""}
              </div>
            </button>
          );
        })}
      </div>

      {activeCenter && (
        <div className="mb-5 tab-fade">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-sm font-semibold mb-2">
            Listings in {URBAN_CENTERS_2040.find((u) => u.id === activeCenter)?.name}
          </div>
          {centerProperties(activeCenter).length === 0 ? (
            <p className="text-sm" style={{ color: T.sub }}>No listings here yet.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {centerProperties(activeCenter).map((p) => (
                <PropertyCard key={p.id} p={p} liveViews={liveViews} />
              ))}
            </div>
          )}
        </div>
      )}

      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold mb-3">
        Sustainability scoring factors
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
        {SUSTAINABILITY_FACTORS.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.key} className="rounded-xl p-3 border flex items-center gap-3" style={{ borderColor: T.line, background: "#fff" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: "#1F8A5C18" }}>
                <Icon size={16} style={{ color: "#1F8A5C" }} />
              </div>
              <span className="text-sm" style={{ color: T.ink }}>{f.label}</span>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] mt-3" style={{ color: T.sub }}>
        Scoring is illustrative on Junction's side — a real implementation would verify these factors
        against actual green building certifications (e.g. Al Sa'fat, LEED) and Dubai Municipality
        / DEWA data rather than self-reported listing claims.
      </p>
    </div>
  );
}

function InvestorZone({ liveViews, properties }) {
  const [verified, setVerified] = useState(false);
  const investorListings = properties.filter((p) => p.visibility === "investor");

  if (!verified) {
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center text-center" style={{ minHeight: "70vh" }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: T.ink }}
        >
          <Lock size={22} color={T.paper} />
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-xl font-semibold mb-2">
          The Investor Zone is private
        </h2>
        <p className="text-sm max-w-md mb-6" style={{ color: T.sub }}>
          Off-market deals, bulk packages, and pre-launch developer projects are only visible to
          verified investors and developers. Verification takes about a day — submit proof of funds
          or a trade license to unlock this zone.
        </p>
        <button
          onClick={() => setVerified(true)}
          className="text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
          style={{ background: T.ink, color: T.paper }}
        >
          <ShieldCheck size={16} /> Simulate verification (demo)
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-2xl font-semibold">
            Investor zone
          </h1>
          <p className="text-sm mt-1" style={{ color: T.sub }}>
            Off-market and pre-launch opportunities — not visible to the public feed.
          </p>
        </div>
        <span
          className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
          style={{ background: "#E9F4EE", color: "#1F7A4D" }}
        >
          <ShieldCheck size={13} /> Verified access
        </span>
      </div>
      <div className="mb-4"><UAEFlagStripe height={3} /></div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {investorListings.map((p) => (
          <PropertyCard key={p.id} p={p} liveViews={liveViews} />
        ))}
      </div>

      <div
        className="mt-6 rounded-xl p-4 flex items-center gap-3 border"
        style={{ borderColor: T.line, background: "#fff" }}
      >
        <Building2 size={20} style={{ color: T.navy }} />
        <div className="text-sm" style={{ color: T.ink }}>
          <span className="font-semibold">Developers:</span> push your pre-launch project directly
          into this zone with an <span style={{ color: T.signal }}>Investor Reach</span> promotion.
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// CALL SCREEN — WhatsApp-style voice / video call overlay
// ---------------------------------------------------------------

function fmtDuration(s) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${sec.toString().padStart(2, "0")}`;
}

function CallScreen({ contact, mode, onEnd }) {
  const [status, setStatus] = useState("calling"); // calling | connected
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [videoOn, setVideoOn] = useState(mode === "video");
  const [speaker, setSpeaker] = useState(false);
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setStatus("connected"), 2200);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (status !== "connected") return;
    const i = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(i);
  }, [status]);

  useEffect(() => {
    if (mode !== "video" || !videoOn) {
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
      return;
    }
    let active = true;
    navigator.mediaDevices
      ?.getUserMedia({ video: true, audio: true })
      .then((stream) => {
        if (!active) return;
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      })
      .catch(() => {
        /* camera unavailable in this preview — self-view falls back to avatar */
      });
    return () => {
      active = false;
      streamRef.current?.getTracks().forEach((tr) => tr.stop());
      streamRef.current = null;
    };
  }, [mode, videoOn]);

  const initials = contact.name
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: T.ink }}>
      {/* Remote "video" / background */}
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{
          background:
            mode === "video"
              ? "linear-gradient(160deg, #2C5278, #14191F 70%)"
              : "linear-gradient(160deg, #1F3D5C, #14191F)",
        }}
      >
        <div className="flex flex-col items-center gap-4">
          <div
            className="rounded-full flex items-center justify-center"
            style={{
              width: "112px",
              height: "112px",
              background: `linear-gradient(135deg, ${T.signal}, ${T.brass})`,
              fontFamily: "'Space Grotesk', sans-serif",
            }}
          >
            <span className="text-3xl font-semibold text-white">{initials}</span>
          </div>
          <div className="text-center">
            <div style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-white text-xl font-semibold">
              {contact.name}
            </div>
            <div className="text-sm mt-1" style={{ color: "#B8C2CC" }}>
              {status === "calling"
                ? mode === "video"
                  ? "Video calling…"
                  : "Calling…"
                : fmtDuration(duration)}
            </div>
          </div>
          {status === "calling" && (
            <div className="flex gap-1.5 mt-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full"
                  style={{
                    background: T.brass,
                    animation: `pulseDot 1.2s ${i * 0.2}s infinite ease-in-out`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulseDot {
          0%, 80%, 100% { opacity: 0.25; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.15); }
        }
      `}</style>

      {/* Self preview (video mode) */}
      {mode === "video" && videoOn && (
        <div
          className="absolute rounded-xl overflow-hidden border-2"
          style={{ top: "20px", right: "16px", width: "96px", height: "128px", borderColor: "rgba(255,255,255,0.2)", background: "#000" }}
        >
          <video ref={videoRef} autoPlay muted playsInline className="w-full h-full object-cover" />
        </div>
      )}

      {/* Top bar */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <span
          className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
          style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}
        >
          {mode === "video" ? "Video call" : "Voice call"} · Junction
        </span>
      </div>

      {/* Controls */}
      <div className="relative z-10 mt-auto flex items-center justify-center gap-4 pb-10">
        <button
          onClick={() => setMuted((m) => !m)}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: muted ? "#fff" : "rgba(255,255,255,0.14)" }}
        >
          {muted ? <MicOff size={20} color={T.ink} /> : <Mic size={20} color="#fff" />}
        </button>
        {mode === "video" && (
          <button
            onClick={() => setVideoOn((v) => !v)}
            className="w-14 h-14 rounded-full flex items-center justify-center"
            style={{ background: !videoOn ? "#fff" : "rgba(255,255,255,0.14)" }}
          >
            {videoOn ? <Video size={20} color="#fff" /> : <VideoOff size={20} color={T.ink} />}
          </button>
        )}
        <button
          onClick={() => setSpeaker((s) => !s)}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: speaker ? "#fff" : "rgba(255,255,255,0.14)" }}
        >
          <Volume2 size={20} color={speaker ? T.ink : "#fff"} />
        </button>
        <button
          onClick={onEnd}
          className="w-14 h-14 rounded-full flex items-center justify-center"
          style={{ background: T.signal }}
        >
          <PhoneOff size={22} color="#fff" />
        </button>
      </div>
    </div>
  );
}


// ---------------------------------------------------------------
// REELS — TikTok-style vertical swipeable property feed
// ---------------------------------------------------------------

function ReelCard({ p, views, liked, onLike, onChat, onCall, isFirst }) {
  return (
    <div
      className="relative w-full h-full flex flex-col justify-end overflow-hidden"
      style={{
        background: `linear-gradient(160deg, ${p.grad[0]}, ${p.grad[1]} 75%)`,
      }}
    >
      {/* subtle texture overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 75% 20%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 15% 85%, rgba(0,0,0,0.25), transparent 50%)",
        }}
      />

      {/* ambient floating balloons */}
      <div className="absolute rounded-full" style={{ width: "70px", height: "70px", background: "rgba(255,255,255,0.08)", top: "18%", left: "8%", animation: "balloonDrift 7s ease-in-out infinite" }} />
      <div className="absolute rounded-full" style={{ width: "110px", height: "110px", background: "rgba(255,255,255,0.05)", top: "50%", right: "-20px", animation: "balloonDrift 9s ease-in-out 1.2s infinite" }} />
      <div className="absolute rounded-full" style={{ width: "44px", height: "44px", background: "rgba(255,255,255,0.10)", top: "75%", left: "22%", animation: "balloonDrift 6s ease-in-out 0.6s infinite" }} />

      {/* top badges */}
      <div className="absolute top-4 left-4 flex gap-1.5 z-10">
        {p.promoted && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: T.brass, color: T.ink }}>
            <Zap size={12} /> Promoted
          </span>
        )}
        {p.trending && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: T.signal, color: "#fff" }}>
            <Flame size={12} /> Trending
          </span>
        )}
      </div>
      <div className="absolute top-4 right-4 z-10">
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: "rgba(0,0,0,0.35)", color: "#fff" }}>
          {LISTER_TYPE_STYLE[p.listedAs]?.label}
        </span>
      </div>

      {/* right action rail */}
      <div className="absolute right-3 bottom-28 flex flex-col items-center gap-5 z-10">
        <button onClick={onLike} className="flex flex-col items-center gap-1">
          <Heart
            size={28}
            color="#fff"
            fill={liked ? T.signal : "none"}
            style={{
              stroke: liked ? T.signal : "#fff",
              transform: liked ? "scale(1.18)" : "scale(1)",
              transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
            }}
          />
          <span className="text-[11px] font-semibold text-white">{liked ? "Saved" : "Save"}</span>
        </button>
        <button onClick={onChat} className="flex flex-col items-center gap-1">
          <MessageCircle size={28} color="#fff" />
          <span className="text-[11px] font-semibold text-white">Chat</span>
        </button>
        <button onClick={onCall} className="flex flex-col items-center gap-1">
          <Phone size={28} color="#fff" />
          <span className="text-[11px] font-semibold text-white">Call</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <Share2 size={26} color="#fff" />
          <span className="text-[11px] font-semibold text-white">Share</span>
        </button>
        <div className="flex flex-col items-center gap-1 mt-1">
          <Eye size={22} color="#fff" />
          <span className="text-[11px] font-semibold text-white">{fmtViews(views)}</span>
        </div>
      </div>

      {/* bottom info */}
      <div className="relative z-10 p-4 pr-20 pb-6">
        {isFirst && (
          <div
            className="flex flex-col items-center text-white mb-2"
            style={{ animation: "swipeHint 1.6s ease-in-out infinite", opacity: 0.85 }}
          >
            <ChevronRight size={18} style={{ transform: "rotate(-90deg)" }} />
            <span className="text-[11px] font-medium">Swipe up for more</span>
          </div>
        )}
        <div
          style={{ fontFamily: "'IBM Plex Mono', monospace" }}
          className="text-2xl font-semibold text-white"
        >
          AED {fmtAED(p.price)}
          {p.priceFreq && <span className="text-sm font-normal"> / {p.priceFreq}</span>}
        </div>
        <div className="text-base font-semibold text-white mt-1">{p.title}</div>
        <div className="flex items-center gap-1 text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
          <MapPin size={13} /> {p.area}, {p.emirate}
        </div>
        <div className="flex items-center gap-3 text-sm mt-2" style={{ color: "rgba(255,255,255,0.85)" }}>
          {p.beds !== null && <span className="flex items-center gap-1"><BedDouble size={14} /> {p.beds}</span>}
          {p.baths !== null && <span className="flex items-center gap-1"><Bath size={14} /> {p.baths}</span>}
          <span className="flex items-center gap-1"><Maximize size={14} /> {p.sqft.toLocaleString()} sqft</span>
        </div>
      </div>
    </div>
  );
}

function ReelsView({ properties, liveViews, onChat }) {
  const [liked, setLiked] = useState({});
  const [activeCall, setActiveCall] = useState(null);

  const visible = properties.filter((p) => p.visibility !== "investor");

  return (
    <div
      className="overflow-y-scroll h-full"
      style={{ scrollSnapType: "y mandatory", background: T.ink }}
    >
      {visible.length === 0 && (
        <div className="h-full flex items-center justify-center text-sm px-6 text-center" style={{ color: T.paper }}>
          No reels yet — post a property to see it here.
        </div>
      )}
      {visible.map((p, idx) => (
        <div key={p.id} className="h-full" style={{ scrollSnapAlign: "start" }}>
          <ReelCard
            p={p}
            views={liveViews[p.id] ?? p.views}
            liked={!!liked[p.id]}
            isFirst={idx === 0}
            onLike={() => setLiked((prev) => ({ ...prev, [p.id]: !prev[p.id] }))}
            onChat={onChat}
            onCall={() =>
              setActiveCall({ mode: "video", contact: { name: `Agent · ${p.area}`, online: true } })
            }
          />
        </div>
      ))}

      {activeCall && (
        <CallScreen contact={activeCall.contact} mode={activeCall.mode} onEnd={() => setActiveCall(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// SERVICES — marketplace for technicians & trades (carpenters,
// plumbers, electricians, etc.) — the "junction grows" feature
// ---------------------------------------------------------------

function ServiceCard({ s, onChat, onCall }) {
  return (
    <div className="rounded-xl overflow-hidden border flex flex-col" style={{ borderColor: T.line, background: "#fff" }}>
      <div
        className="h-20 relative flex items-center px-3"
        style={{ background: `linear-gradient(135deg, ${s.grad[0]}, ${s.grad[1]})` }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-lg shrink-0"
          style={{ background: "rgba(255,255,255,0.18)", fontFamily: "'Space Grotesk', sans-serif" }}
        >
          {s.name[0]}
        </div>
        <span
          className="text-[11px] font-semibold px-2 py-1 rounded-full absolute top-2 right-2 flex items-center gap-1"
          style={{ background: s.online ? "#1F7A4D" : "rgba(0,0,0,0.35)", color: "#fff" }}
        >
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#fff" }} />
          {s.online ? "Available now" : "Offline"}
        </span>
      </div>
      <div className="p-3.5 flex flex-col gap-1.5 flex-1">
        <div className="text-sm font-semibold" style={{ color: T.ink }}>{s.name}</div>
        <div className="text-xs font-medium flex items-center gap-1" style={{ color: T.navy }}>
          <Wrench size={12} /> {s.category}
        </div>
        <div className="flex items-center gap-1 text-xs" style={{ color: T.sub }}>
          <MapPin size={12} /> {s.area}, {s.emirate}
        </div>
        <div className="flex items-center justify-between text-xs mt-1" style={{ color: T.sub }}>
          <span className="flex items-center gap-1" style={{ color: T.brass }}>
            <Star size={12} fill={T.brass} stroke="none" /> {s.rating} · {s.jobsCompleted} jobs
          </span>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }}>{s.rate}</span>
        </div>
        <div className="flex gap-2 mt-2 pt-2 border-t" style={{ borderColor: T.line }}>
          <button
            onClick={onChat}
            className="flex-1 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
            style={{ background: T.paper, color: T.ink }}
          >
            <MessageCircle size={13} /> Chat
          </button>
          <button
            onClick={onCall}
            disabled={!s.online}
            className="flex-1 text-xs font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
            style={{ background: s.online ? T.navy : T.line, color: s.online ? "#fff" : T.sub }}
          >
            <Phone size={13} /> Call
          </button>
        </div>
      </div>
    </div>
  );
}

function PostServiceModal({ onClose, statuses, onPublish }) {
  const [form, setForm] = useState({ name: "", category: SERVICE_CATEGORIES[0], emirate: "Dubai", area: "", rate: "" });
  const emiratesIdOk = (statuses.EMIRATES_ID || "none") === "verified";
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center" style={{ background: "rgba(20,25,31,0.5)" }}>
      <div className="w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto" style={{ background: "#fff" }}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0" style={{ borderColor: T.line, background: "#fff" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold">
            List your service
          </div>
          <button onClick={onClose}><X size={18} style={{ color: T.sub }} /></button>
        </div>

        {!emiratesIdOk ? (
          <div className="p-5 flex flex-col gap-3 items-center text-center">
            <CreditCard size={28} style={{ color: T.navy }} />
            <div className="text-sm font-semibold" style={{ color: T.ink }}>Verify your Emirates ID first</div>
            <p className="text-xs max-w-xs" style={{ color: T.sub }}>
              Any tradesperson — carpenter, plumber, electrician, AC technician, and more — can list
              their service once Emirates ID verification is complete.
            </p>
            <button onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: T.ink, color: T.paper }}>
              Got it
            </button>
          </div>
        ) : (
          <div className="p-4 flex flex-col gap-3">
            <input
              placeholder="Your name or business name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border outline-none"
              style={{ borderColor: T.line }}
            />
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
              {SERVICE_CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.emirate} onChange={(e) => update("emirate", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                <option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option><option>Ajman</option><option>Ras Al Khaimah</option>
              </select>
              <input placeholder="Area" value={form.area} onChange={(e) => update("area", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            </div>
            <input placeholder="Rate, e.g. AED 100/hr" value={form.rate} onChange={(e) => update("rate", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line, fontFamily: "'IBM Plex Mono', monospace" }} />
            <div
              className="text-[11px] px-3 py-2 rounded-lg flex items-start gap-2"
              style={{ background: "#FDF3E2", color: "#9A6B17" }}
            >
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              Your listing will show as "Pending review" until our team confirms it's a genuine
              real-estate-related service before it goes live.
            </div>
            <button
              onClick={() => {
                onPublish({
                  id: `s${Date.now()}`,
                  name: form.name || "New provider",
                  category: form.category,
                  emirate: form.emirate,
                  area: form.area || "—",
                  rating: 0,
                  jobsCompleted: 0,
                  online: true,
                  rate: form.rate || "—",
                  pending: true,
                  grad: ["#2C5278", "#14191F"],
                });
              }}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg"
              style={{ background: T.ink, color: T.paper }}
            >
              Submit for review
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ServicesView({ providers, statuses, onChat }) {
  const [filter, setFilter] = useState("All");
  const [showPost, setShowPost] = useState(false);
  const [list, setList] = useState(providers);
  const [activeCall, setActiveCall] = useState(null);

  const cats = ["All", ...SERVICE_CATEGORIES];
  const filtered = filter === "All" ? list : list.filter((s) => s.category === filter);

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-start justify-between mb-1">
        <div>
          <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-2xl font-semibold">
            Services
          </h1>
          <p className="text-sm mt-1 max-w-md" style={{ color: T.sub }}>
            Carpenters, plumbers, electricians, AC technicians and more — verified tradespeople any
            agent, owner, or developer can contact directly.
          </p>
        </div>
        <button
          onClick={() => setShowPost(true)}
          className="text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap"
          style={{ background: T.navy2, color: "#fff" }}
        >
          List your service
        </button>
      </div>

      <div className="flex gap-2 overflow-x-auto py-3 mb-1">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full border whitespace-nowrap"
            style={{
              borderColor: filter === c ? T.navy : T.line,
              background: filter === c ? T.navy : "#fff",
              color: filter === c ? "#fff" : T.ink,
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((s) => (
          <div key={s.id} className="relative">
            <ServiceCard s={s} onChat={onChat} onCall={() => setActiveCall({ name: s.name, online: s.online })} />
            {s.pending && (
              <span
                className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-1 rounded-full"
                style={{ background: "#FDF3E2", color: "#9A6B17" }}
              >
                Pending review
              </span>
            )}
          </div>
        ))}
      </div>

      {showPost && (
        <PostServiceModal
          onClose={() => setShowPost(false)}
          statuses={statuses}
          onPublish={(s) => {
            setList((prev) => [s, ...prev]);
            setShowPost(false);
          }}
        />
      )}

      {activeCall && (
        <CallScreen contact={activeCall} mode="voice" onEnd={() => setActiveCall(null)} />
      )}
    </div>
  );
}

const CHAT_PERSONAS = {
  c1: `You are Sarah Mitchell, a prospective buyer chatting with an agent on the Junction app about "Sky-line 2BR in Marina Gate" (AED 2,450,000, Dubai Marina). You're friendly, decisive, and interested in scheduling a viewing and understanding payment terms / mortgage pre-approval. Keep replies short (1-3 sentences), like a real text message. Stay in character as Sarah only — never mention you are an AI.`,
  c2: `You are a representative of Reem Capital Homes, a developer chatting with an agent on the Junction app about "Off-plan Tower — Reem Island" (Al Reem Island, Abu Dhabi). You're professional and focused on unit availability, floor plans, and payment plans for off-plan units. Keep replies short (1-3 sentences). Stay in character only — never mention you are an AI.`,
};

function MessagesView() {
  const [activeId, setActiveId] = useState(CHAT_THREADS[0].id);
  const [draft, setDraft] = useState("");
  const [threads, setThreads] = useState(CHAT_THREADS);
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState("list"); // "list" | "chat"
  const [activeCall, setActiveCall] = useState(null); // { mode: "voice" | "video" } | null
  const active = threads.find((t) => t.id === activeId);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;

    const userMsg = { from: "me", text };
    const thread = threads.find((t) => t.id === activeId);
    setDraft("");

    // Offline contacts don't reply immediately — mirrors a real chat experience
    if (!thread.online || !CHAT_PERSONAS[activeId]) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? {
                ...t,
                messages: [
                  ...t.messages,
                  userMsg,
                  { from: "system", text: `${t.name} is offline — they'll see this when they're back online.` },
                ],
              }
            : t
        )
      );
      return;
    }

    setThreads((prev) =>
      prev.map((t) => (t.id === activeId ? { ...t, messages: [...t.messages, userMsg] } : t))
    );

    setSending(true);
    try {
      if (!AI_FEATURES_LIVE) {
        await new Promise((r) => setTimeout(r, 600));
        setThreads((prev) =>
          prev.map((t) =>
            t.id === activeId ? { ...t, messages: [...t.messages, { from: "system", text: AI_UNAVAILABLE_MSG }] } : t
          )
        );
        setSending(false);
        return;
      }
      const history = [...thread.messages, userMsg].map((m) => ({
        role: m.from === "me" ? "user" : "assistant",
        content: m.text,
      }));
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 300,
          system: CHAT_PERSONAS[activeId],
          messages: history,
        }),
      });
      const data = await response.json();
      const reply = (data?.content || [])
        .map((b) => (b.type === "text" ? b.text : ""))
        .filter(Boolean)
        .join("\n") || "...";
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeId ? { ...t, messages: [...t.messages, { from: "them", text: reply }] } : t
        )
      );
    } catch (e) {
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeId
            ? { ...t, messages: [...t.messages, { from: "system", text: "Message couldn't be delivered — try again." }] }
            : t
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-full" style={{ minHeight: "70vh" }}>
      <div
        className={`${mobileView === "chat" ? "hidden" : "flex"} sm:flex w-full sm:w-72 border-r flex-col`}
        style={{ borderColor: T.line }}
      >
        <div className="p-4 border-b" style={{ borderColor: T.line }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-lg font-semibold">
            Messages
          </h2>
          <p className="text-xs mt-0.5" style={{ color: T.sub }}>Free for every role — buyers, agents, investors, developers.</p>
        </div>
        <div className="overflow-y-auto flex-1">
          {threads.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                setActiveId(t.id);
                setMobileView("chat");
              }}
              className="w-full text-left p-3 border-b flex items-center gap-3"
              style={{
                borderColor: T.line,
                background: t.id === activeId ? T.paper : "transparent",
              }}
            >
              <div className="relative shrink-0">
                <Avatar name={t.name} size={40} />
                <span
                  className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
                  style={{ background: t.online ? "#1F7A4D" : T.line, borderColor: "#fff" }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold" style={{ color: T.ink }}>{t.name}</span>
                  <span
                    className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: T.line, color: T.sub }}
                  >
                    {t.role}
                  </span>
                </div>
                <span className="text-xs truncate block" style={{ color: T.sub }}>{t.property}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className={`${mobileView === "list" ? "hidden" : "flex"} sm:flex flex-col flex-1`}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: T.line }}>
          <button onClick={() => setMobileView("list")} className="sm:hidden">
            <ArrowLeft size={18} style={{ color: T.ink }} />
          </button>
          <div className="relative shrink-0">
            <Avatar name={active.name} size={36} />
            <span
              className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
              style={{ background: active.online ? "#1F7A4D" : T.line, borderColor: "#fff" }}
            />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold" style={{ color: T.ink }}>{active.name}</div>
            <div className="text-xs" style={{ color: T.sub }}>Re: {active.property}</div>
          </div>
          <button
            onClick={() => active.online && setActiveCall({ mode: "voice" })}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: active.online ? T.paper : "transparent", opacity: active.online ? 1 : 0.35 }}
            title={active.online ? "Voice call" : `${active.name} is offline`}
          >
            <Phone size={16} style={{ color: T.navy }} />
          </button>
          <button
            onClick={() => active.online && setActiveCall({ mode: "video" })}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: active.online ? T.paper : "transparent", opacity: active.online ? 1 : 0.35 }}
            title={active.online ? "Video call" : `${active.name} is offline`}
          >
            <Video size={16} style={{ color: T.navy }} />
          </button>
        </div>
        <div className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {active.messages.map((m, i) =>
            m.from === "system" ? (
              <div key={i} className="text-center text-xs py-1" style={{ color: T.sub }}>
                {m.text}
              </div>
            ) : (
              <div
                key={i}
                className="flex items-end gap-2"
                style={{ alignSelf: m.from === "me" ? "flex-end" : "flex-start", flexDirection: m.from === "me" ? "row-reverse" : "row" }}
              >
                {m.from === "them" && <Avatar name={active.name} size={28} />}
                <div
                  className="max-w-[70%] text-sm px-3 py-2 rounded-xl"
                  style={{
                    background: m.from === "me" ? T.navy : "#fff",
                    color: m.from === "me" ? "#fff" : T.ink,
                    border: m.from === "me" ? "none" : `1px solid ${T.line}`,
                  }}
                >
                  {m.text}
                </div>
              </div>
            )
          )}
          {sending && (
            <div
              className="text-sm px-3 py-2 rounded-xl flex items-center gap-1"
              style={{ alignSelf: "flex-start", background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}
            >
              <Loader2 size={13} className="animate-spin" /> {active.name} is typing…
            </div>
          )}
        </div>
        <div className="p-3 border-t flex items-center gap-2" style={{ borderColor: T.line }}>
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Type a message…"
            disabled={sending}
            className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none"
            style={{ borderColor: T.line }}
          />
          <button
            onClick={send}
            disabled={sending}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: T.navy, opacity: sending ? 0.6 : 1 }}
          >
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>

      {activeCall && (
        <CallScreen contact={active} mode={activeCall.mode} onEnd={() => setActiveCall(null)} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// BUSINESS PAGE — company/professional profile
// ---------------------------------------------------------------

function BusinessPageView({ properties }) {
  const me = LEADERBOARD.find((l) => l.you);
  const myListings = properties.filter((p) =>
    p.listingChain?.some((c) => c.name.includes("Yousef K."))
  );
  const myServices = SERVICE_PROVIDERS.filter((s) => s.name === "Elite Interiors Studio");

  return (
    <div className="p-4 md:p-6">
      <div
        className="rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center gap-4"
        style={{ background: `linear-gradient(135deg, ${T.navy2}, ${T.ink})` }}
      >
        <Avatar name="Yousef K." size={64} />
        <div className="flex-1">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-semibold text-white">
            Yousef K. — Skyline Properties
          </div>
          <div className="text-sm mt-0.5" style={{ color: "#B8C2CC" }}>
            Licensed broker · RERA #48213 · Dubai
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: `${TIER_STYLE[me.tier].color}33`, color: TIER_STYLE[me.tier].color }}>
              <Crown size={12} /> {TIER_STYLE[me.tier].label} agent
            </span>
            <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(255,255,255,0.12)", color: "#fff" }}>
              <ShieldCheck size={12} /> RERA verified
            </span>
          </div>
        </div>
        <button className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: T.paper, color: T.ink }}>
          Edit business page
        </button>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-4">
        <div className="rounded-xl p-3 border text-center" style={{ borderColor: T.line, background: "#fff" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-lg font-semibold">{myListings.length}</div>
          <div className="text-[11px]" style={{ color: T.sub }}>Active listings</div>
        </div>
        <div className="rounded-xl p-3 border text-center" style={{ borderColor: T.line, background: "#fff" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-lg font-semibold">{me.score.toLocaleString()}</div>
          <div className="text-[11px]" style={{ color: T.sub }}>Engagement score</div>
        </div>
        <div className="rounded-xl p-3 border text-center" style={{ borderColor: T.line, background: "#fff" }}>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-lg font-semibold flex items-center justify-center gap-1">
            <Star size={14} fill={T.brass} stroke="none" /> 4.9
          </div>
          <div className="text-[11px]" style={{ color: T.sub }}>Client rating</div>
        </div>
      </div>

      <div className="mt-5">
        <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold mb-2">
          Listings
        </div>
        {myListings.length === 0 ? (
          <div className="text-sm" style={{ color: T.sub }}>No active listings linked to this profile yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myListings.map((p) => (
              <PropertyCard key={p.id} p={p} liveViews={{}} />
            ))}
          </div>
        )}
      </div>

      {myServices.length > 0 && (
        <div className="mt-5">
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold mb-2">
            Services offered
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {myServices.map((s) => (
              <ServiceCard key={s.id} s={s} onChat={() => {}} onCall={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// TRANSACTIONS & BANK PARTNERS
// ---------------------------------------------------------------

function TransactionsView() {
  return (
    <div className="p-4 md:p-6">
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-2xl font-semibold mb-1">
        Transactions
      </h1>
      <p className="text-sm mb-4" style={{ color: T.sub }}>
        Bank partners for financing, plus your full history of promotions, sales, and service
        bookings on Junction.
      </p>

      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold mb-2">
        Bank partners
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-5">
        {BANK_PARTNERS.map((b) => (
          <div
            key={b.name}
            className="rounded-xl p-4 shrink-0 flex flex-col gap-2"
            style={{ width: "200px", background: `linear-gradient(135deg, ${b.grad[0]}, ${b.grad[1]})` }}
          >
            <div className="flex items-center gap-2">
              <Building2 size={18} color="#fff" />
              <span className="text-sm font-semibold text-white">{b.name}</span>
            </div>
            <ul className="text-[11px] flex flex-col gap-0.5" style={{ color: "rgba(255,255,255,0.85)" }}>
              {b.services.map((s) => <li key={s}>• {s}</li>)}
            </ul>
            <button className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg mt-1 self-start" style={{ background: "rgba(255,255,255,0.18)", color: "#fff" }}>
              Get started
            </button>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold mb-2">
        Transaction history
      </div>
      <div className="flex flex-col gap-2">
        {TRANSACTIONS.map((t) => (
          <div key={t.id} className="rounded-xl p-3 border flex items-center justify-between gap-3" style={{ borderColor: T.line, background: "#fff" }}>
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paper }}>
                <CreditCard size={16} style={{ color: T.navy }} />
              </div>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate" style={{ color: T.ink }}>{t.item}</div>
                <div className="text-[11px]" style={{ color: T.sub }}>{t.type} · {t.date}</div>
                {t.dldRef && (
                  <div className="text-[11px] mt-0.5 flex items-center gap-1" style={{ color: T.navy }}>
                    <ShieldCheck size={11} /> Linked to DLD transaction {t.dldRef}
                  </div>
                )}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-sm font-semibold">
                AED {fmtAED(t.amount)}
              </div>
              <span
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  background: t.status === "Completed" ? "#E9F4EE" : "#FDF3E2",
                  color: t.status === "Completed" ? "#1F7A4D" : "#9A6B17",
                }}
              >
                {t.status}
              </span>
            </div>
          </div>
        ))}
      </div>
      <p className="text-[11px] mt-4" style={{ color: T.sub }}>
        DLD transaction links shown above are illustrative. A real integration requires access to
        Dubai Land Department's transaction APIs/records, set up as part of your compliance
        partnerships.
      </p>
    </div>
  );
}

function DashboardView() {
  const me = LEADERBOARD.find((l) => l.you);
  return (
    <div className="p-4 md:p-6">
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-2xl font-semibold mb-1">
        Agent dashboard
      </h1>
      <p className="text-sm mb-5" style={{ color: T.sub }}>
        Engagement-based ranking — more views and faster replies move you up the leaderboard.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
        <div className="rounded-xl p-4 border" style={{ borderColor: T.line, background: "#fff" }}>
          <div className="text-xs font-medium mb-1" style={{ color: T.sub }}>Views (7 days)</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-2xl font-semibold">7,150</div>
          <div className="text-xs mt-1 flex items-center gap-1" style={{ color: "#1F7A4D" }}>
            <TrendingUp size={13} /> +28% vs last week
          </div>
        </div>
        <div className="rounded-xl p-4 border" style={{ borderColor: T.line, background: "#fff" }}>
          <div className="text-xs font-medium mb-1" style={{ color: T.sub }}>New inquiries</div>
          <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-2xl font-semibold">34</div>
          <div className="text-xs mt-1" style={{ color: T.sub }}>Across 6 active listings</div>
        </div>
        <div
          className="rounded-xl p-4 border flex items-center justify-between"
          style={{ borderColor: T.brass, background: "#FDF8EC" }}
        >
          <div>
            <div className="text-xs font-medium mb-1" style={{ color: T.sub }}>Your tier</div>
            <div className="text-2xl font-semibold flex items-center gap-1.5" style={{ color: T.ink, fontFamily: "'Space Grotesk', sans-serif" }}>
              <Crown size={18} style={{ color: T.brass }} /> Top 5%
            </div>
            <div className="text-xs mt-1" style={{ color: T.sub }}>2 free Featured boosts this month</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl p-4 border" style={{ borderColor: T.line, background: "#fff" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: T.ink }}>Views this week</div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={VIEW_HISTORY}>
              <defs>
                <linearGradient id="viewGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={T.signal} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={T.signal} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: T.sub }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: T.sub }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Area type="monotone" dataKey="views" stroke={T.signal} fill="url(#viewGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-xl p-4 border" style={{ borderColor: T.line, background: "#fff" }}>
          <div className="text-sm font-semibold mb-3" style={{ color: T.ink }}>Leaderboard — Dubai, this week</div>
          <div className="flex flex-col gap-2">
            {LEADERBOARD.map((l) => (
              <div
                key={l.rank}
                className="flex items-center justify-between p-2 rounded-lg"
                style={{ background: l.you ? T.paper : "transparent" }}
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold"
                    style={{ background: l.rank <= 3 ? T.ink : T.line, color: l.rank <= 3 ? "#fff" : T.sub }}
                  >
                    {l.rank}
                  </span>
                  <div>
                    <div className="text-xs font-semibold" style={{ color: T.ink }}>{l.name}</div>
                    <div className="text-[11px]" style={{ color: T.sub }}>{l.agency}</div>
                  </div>
                </div>
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: `${TIER_STYLE[l.tier].color}22`, color: TIER_STYLE[l.tier].color }}
                >
                  {TIER_STYLE[l.tier].label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function VerifyView({ statuses, setStatuses }) {
  const advance = (type) => {
    setStatuses((prev) => {
      const cur = prev[type] || "none";
      const next = cur === "none" ? "pending" : cur === "pending" ? "verified" : "verified";
      return { ...prev, [type]: next };
    });
  };

  return (
    <div className="p-4 md:p-6">
      <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-2xl font-semibold mb-1">
        Get verified
      </h1>
      <p className="text-sm mb-5 max-w-2xl" style={{ color: T.sub }}>
        Verification is what keeps Junction open to everyone while staying compliant. An Emirates ID
        is enough to start listing, chatting, and earning referral fees. Brokers and developers add
        their RERA/DLD or trade license to unlock more.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {VERIFICATION_TIERS.map((tier) => {
          const status = statuses[tier.type] || "none";
          const Icon = tier.icon;
          return (
            <div key={tier.type} className="rounded-xl p-4 border flex flex-col gap-3" style={{ borderColor: T.line, background: "#fff" }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: T.paper }}>
                    <Icon size={17} style={{ color: T.navy }} />
                  </div>
                  <div>
                    <div className="text-sm font-semibold" style={{ color: T.ink }}>{tier.title}</div>
                    <div className="text-xs" style={{ color: T.sub }}>{tier.subtitle}</div>
                  </div>
                </div>
                {status === "verified" && (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "#E9F4EE", color: "#1F7A4D" }}>
                    <CheckCircle2 size={12} /> Verified
                  </span>
                )}
                {status === "pending" && (
                  <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: "#FDF3E2", color: "#9A6B17" }}>
                    Pending review
                  </span>
                )}
              </div>

              <ul className="text-xs flex flex-col gap-1" style={{ color: T.sub }}>
                {tier.unlocks.map((u, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span style={{ color: T.navy2 }}>•</span> {u}
                  </li>
                ))}
              </ul>

              {status !== "verified" && (
                <button
                  onClick={() => advance(tier.type)}
                  className="text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 mt-auto"
                  style={{ background: T.ink, color: T.paper }}
                >
                  <Upload size={13} />
                  {status === "none" ? "Upload document (demo)" : "Simulate approval"}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PostPropertyModal({ onClose, statuses, onPublish }) {
  const [step, setStep] = useState(1);
  const [listedAs, setListedAs] = useState(null);
  const [form, setForm] = useState({
    title: "",
    type: "Sale",
    category: "Apartment",
    price: "",
    emirate: "Dubai",
    area: "",
  });

  const emiratesIdOk = (statuses.EMIRATES_ID || "none") === "verified";

  const listerOptions = [
    { type: "OWNER_LISTING", label: "I own this property", requires: "EMIRATES_ID" },
    { type: "REFERRAL_PARTNER", label: "I'm referring a lead (finder's fee)", requires: "EMIRATES_ID" },
    { type: "LICENSED_BROKER", label: "I'm a licensed broker", requires: "RERA_BROKER" },
    { type: "DEVELOPER", label: "I represent a developer", requires: "TRADE_LICENSE" },
  ];

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center" style={{ background: "rgba(20,25,31,0.5)" }}>
      <div className="w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl max-h-[88vh] overflow-y-auto" style={{ background: "#fff" }}>
        <div className="flex items-center justify-between p-4 border-b sticky top-0" style={{ borderColor: T.line, background: "#fff" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold">
            Post a property
          </div>
          <button onClick={onClose}><X size={18} style={{ color: T.sub }} /></button>
        </div>

        {!emiratesIdOk && (
          <div className="p-5 flex flex-col gap-3 items-center text-center">
            <CreditCard size={28} style={{ color: T.navy }} />
            <div className="text-sm font-semibold" style={{ color: T.ink }}>Verify your Emirates ID first</div>
            <p className="text-xs max-w-xs" style={{ color: T.sub }}>
              Posting requires a basic identity check. Head to "Get verified" and complete the
              Emirates ID step — it only takes a minute in the demo.
            </p>
            <button onClick={onClose} className="text-xs font-semibold px-4 py-2 rounded-lg" style={{ background: T.ink, color: T.paper }}>
              Got it
            </button>
          </div>
        )}

        {emiratesIdOk && step === 1 && (
          <div className="p-4 flex flex-col gap-3">
            <div className="text-xs font-semibold" style={{ color: T.sub }}>STEP 1 — How are you listing this?</div>
            {listerOptions.map((opt) => {
              const eligible = (statuses[opt.requires] || "none") === "verified";
              return (
                <button
                  key={opt.type}
                  disabled={!eligible}
                  onClick={() => setListedAs(opt.type)}
                  className="text-left p-3 rounded-lg border flex items-center justify-between"
                  style={{
                    borderColor: listedAs === opt.type ? T.navy : T.line,
                    background: listedAs === opt.type ? T.paper : "#fff",
                    opacity: eligible ? 1 : 0.45,
                  }}
                >
                  <div>
                    <div className="text-sm font-medium" style={{ color: T.ink }}>{opt.label}</div>
                    {!eligible && (
                      <div className="text-[11px] mt-0.5" style={{ color: T.sub }}>
                        Requires {VERIFICATION_TIERS.find((t) => t.type === opt.requires)?.title} — verify first
                      </div>
                    )}
                  </div>
                  {listedAs === opt.type && <CheckCircle2 size={16} style={{ color: T.navy }} />}
                </button>
              );
            })}
            <button
              disabled={!listedAs}
              onClick={() => setStep(2)}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5 mt-2"
              style={{ background: listedAs ? T.ink : T.line, color: listedAs ? T.paper : T.sub }}
            >
              Continue <ArrowRight size={15} />
            </button>
          </div>
        )}

        {emiratesIdOk && step === 2 && (
          <div className="p-4 flex flex-col gap-3">
            <div className="text-xs font-semibold" style={{ color: T.sub }}>STEP 2 — Property details</div>
            <input placeholder="Title, e.g. Sea-view 1BR in JBR" value={form.title} onChange={(e) => update("title", e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            <div className="grid grid-cols-2 gap-2">
              <select value={form.type} onChange={(e) => update("type", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                <option>Sale</option><option>Rent</option>
              </select>
              <select value={form.category} onChange={(e) => update("category", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                <option>Apartment</option><option>Villa</option><option>Townhouse</option><option>Office</option><option>Land</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.emirate} onChange={(e) => update("emirate", e.target.value)} className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                <option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option><option>Ajman</option><option>Ras Al Khaimah</option>
              </select>
              <input placeholder="Area, e.g. Dubai Marina" value={form.area} onChange={(e) => update("area", e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            </div>
            <input placeholder="Price (AED)" value={form.price} onChange={(e) => update("price", e.target.value)}
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line, fontFamily: "'IBM Plex Mono', monospace" }} />
            <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs" style={{ borderColor: T.line, color: T.sub }}>
              <Upload size={16} className="mx-auto mb-1" /> Drop photos here (demo)
            </div>
            <div className="flex gap-2">
              <button onClick={() => setStep(1)} className="text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center gap-1.5" style={{ background: T.paper, color: T.ink }}>
                <ArrowLeft size={15} /> Back
              </button>
              <button onClick={() => setStep(3)} className="flex-1 text-sm font-semibold px-4 py-2.5 rounded-lg flex items-center justify-center gap-1.5" style={{ background: T.ink, color: T.paper }}>
                Review <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}

        {emiratesIdOk && step === 3 && (
          <div className="p-5 flex flex-col gap-3 items-center text-center">
            <CheckCircle2 size={32} style={{ color: "#1F7A4D" }} />
            <div className="text-base font-semibold" style={{ color: T.ink }}>Ready to publish</div>
            <p className="text-xs" style={{ color: T.sub }}>
              This listing will go live tagged as
              <span className="font-semibold" style={{ color: LISTER_TYPE_STYLE[listedAs]?.color }}> {LISTER_TYPE_STYLE[listedAs]?.label}</span>,
              and will start tracking views immediately for the engagement leaderboard.
            </p>
            <div className="w-full rounded-lg border p-3 text-left text-sm" style={{ borderColor: T.line }}>
              <div className="font-semibold" style={{ color: T.ink }}>{form.title || "Untitled listing"}</div>
              <div style={{ color: T.sub }} className="text-xs mt-1">{form.type} · {form.category} · {form.area || "—"}, {form.emirate}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", color: T.ink }} className="text-sm mt-1">AED {form.price || "—"}</div>
            </div>
            <button
              onClick={() => {
                const newProperty = {
                  id: `p${Date.now()}`,
                  title: form.title || "Untitled listing",
                  type: form.type,
                  category: form.category,
                  price: Number(form.price) || 0,
                  priceFreq: form.type === "Rent" ? "yr" : undefined,
                  area: form.area || "—",
                  emirate: form.emirate,
                  beds: null,
                  baths: null,
                  sqft: 0,
                  views: 0,
                  trending: false,
                  promoted: false,
                  visibility: listedAs === "DEVELOPER" ? "public" : "public",
                  listedAs,
                  grad: ["#3A6FA0", "#1F3D5C"],
                };
                onPublish(newProperty);
              }}
              className="text-sm font-semibold px-4 py-2.5 rounded-lg w-full"
              style={{ background: T.ink, color: T.paper }}
            >
              Publish listing (demo)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


// ---------------------------------------------------------------
// AI ASSISTANT — "Junction AI"
// Floating concierge that can search live listings, check who's
// online in your conversations, and help draft a new listing.
// ---------------------------------------------------------------

function buildAssistantContext(properties, threads) {
  const listingLines = properties
    .map((p) => {
      const lister = LISTER_TYPE_STYLE[p.listedAs]?.label || "Owner";
      const priceStr = p.priceFreq ? `AED ${p.price}/${p.priceFreq}` : `AED ${p.price}`;
      return `- "${p.title}" | ${p.type} | ${p.category} | ${p.area}, ${p.emirate} | ${priceStr} | beds:${p.beds ?? "-"} baths:${p.baths ?? "-"} | listed by: ${lister} | views: ${p.views}`;
    })
    .join("\n");

  const contactLines = threads
    .map((t) => `- ${t.name} (${t.role}) — ${t.online ? "online now" : "offline"} — last about "${t.property}"`)
    .join("\n");

  return `You are "Junction AI", the built-in concierge for Junction, a UAE real-estate platform connecting buyers, agents, investors and developers.

Your job:
1. Help the user find matching listings from the data below (suggest specific listings by title, price, area, and who listed them).
2. If asked about a contact's availability, answer from the contacts list below.
3. If the user wants to post/list a property, briefly confirm key details (title, type, category, price, area, emirate) conversationally, then tell them you've prepared the listing and they can tap "Open listing form" to finish and publish it.

Be concise, warm, and practical. Use AED for prices. If nothing matches, say so plainly and suggest the closest alternatives.

CURRENT LIVE LISTINGS:
${listingLines}

USER'S RECENT CONTACTS:
${contactLines}
`;
}

function AIAssistant({ properties, threads, onOpenPost, autoQuery }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      text: "Hi, I'm Junction AI. Tell me what you're looking for — a property, a contact's status, or I can help you list something new.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const firedAutoQuery = useRef(false);

  const suggestions = [
    "I need a villa for rent",
    "Is Marc online?",
    "Help me list a property",
  ];

  useEffect(() => {
    if (autoQuery && !firedAutoQuery.current) {
      firedAutoQuery.current = true;
      setOpen(true);
      send(autoQuery);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoQuery]);

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", text: content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    try {
      if (!AI_FEATURES_LIVE) {
        await new Promise((r) => setTimeout(r, 600));
        setMessages((prev) => [...prev, { role: "assistant", text: AI_UNAVAILABLE_MSG }]);
        setLoading(false);
        return;
      }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: buildAssistantContext(properties, threads),
          messages: next.map((m) => ({ role: m.role, content: m.text })),
        }),
      });
      const data = await response.json();
      const text2 = (data?.content || [])
        .map((b) => (b.type === "text" ? b.text : ""))
        .filter(Boolean)
        .join("\n");
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: text2 || "Sorry, I couldn't find an answer to that." },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: "I'm having trouble connecting right now — please try again in a moment." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{
          right: "20px",
          bottom: "84px",
          width: "60px",
          height: "60px",
          background: "linear-gradient(135deg, #006EFF, #00CFFF)",
          boxShadow: "0 0 20px rgba(0,207,255,0.5), 0 4px 16px rgba(0,0,0,.3)",
        }}
      >
        <JunctionLogoMark size={30} glow />
      </button>

      {/* Panel */}
      {open && (
        <div
          className="fixed z-40 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            right: "16px",
            left: "16px",
            bottom: "80px",
            maxWidth: "380px",
            marginLeft: "auto",
            height: "min(70vh, 520px)",
            background: "#020D1A",
            border: "1px solid #00CFFF33",
          }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ background: "#061628", borderBottom: "1px solid #00CFFF22" }}
          >
            <div className="flex items-center gap-2.5">
              <JunctionLogoMark size={24} glow />
              <span style={{ fontFamily: "'Space Grotesk', sans-serif", color: "#00CFFF",
                textShadow: "0 0 10px #00CFFF66", letterSpacing: ".04em" }}
                className="text-sm font-bold">
                JUNCTION AI
              </span>
            </div>
            <button onClick={() => setOpen(false)}>
              <X size={16} color="#4A8AAA" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-2"
            style={{ background: "#020D1A" }}>
            {messages.map((m, i) => (
              <div
                key={i}
                className="max-w-[85%] text-sm px-3 py-2 rounded-xl whitespace-pre-wrap"
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  background: m.role === "user"
                    ? "linear-gradient(135deg,#006EFF,#00CFFF)"
                    : "#0A1E30",
                  color: "#B8EEFF",
                  border: m.role === "user" ? "none" : "1px solid #00CFFF22",
                }}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-xs px-1" style={{ color: "#3A7A9A" }}>
                <Loader2 size={14} className="animate-spin" /> Processing…
              </div>
            )}
            {!loading && messages.some((m) => /listing form|publish/i.test(m.text)) && (
              <button
                onClick={() => { setOpen(false); onOpenPost(); }}
                className="self-start text-xs font-semibold px-3 py-2 rounded-lg"
                style={{ background: "linear-gradient(135deg,#00CFFF,#5B9EFF)", color: "#04111F" }}
              >
                Open listing form
              </button>
            )}
          </div>

          {messages.length <= 1 && (
            <div className="px-3 pb-2 flex flex-wrap gap-1.5"
              style={{ background: "#020D1A" }}>
              {suggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded-full border"
                  style={{ borderColor: "#00CFFF33", color: "#4A8AAA" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          <div className="p-2.5 border-t flex items-center gap-2"
            style={{ borderColor: "#00CFFF22", background: "#061628" }}>
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Ask Junction AI…"
              className="flex-1 text-sm px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: "#00CFFF22", background: "#0A1E30", color: "#B8EEFF",
                fontFamily: "'IBM Plex Mono',monospace" }}
            />
            <button
              onClick={() => send()}
              className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "linear-gradient(135deg,#006EFF,#00CFFF)" }}
            >
              <Send size={15} color="#fff" />
            </button>
          </div>
        </div>
      )}
    </>
  );
}

const NAV = [
  { id: "feed", label: "Feed", icon: LayoutGrid },
  { id: "reels", label: "Reels", icon: PlayCircle },
  { id: "services", label: "Services", icon: Wrench },
  { id: "vision2040", label: "Vision 2040", icon: Leaf },
  { id: "investor", label: "Investor zone", icon: Lock },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "business", label: "Business page", icon: Building2 },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "dashboard", label: "Dashboard", icon: BarChart3 },
  { id: "verify", label: "Get verified", icon: UserCheck },
];

// ---------------------------------------------------------------
// INTRO — AI face landing screen, the new first impression
// ---------------------------------------------------------------

// ---------------------------------------------------------------
// JUNCTION LOGO COMPONENT — used in nav + intro face
// ---------------------------------------------------------------
function JunctionLogoMark({ size = 28, glow = false }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
      style={glow ? { animation: "logoCoreGlow 2.4s ease-in-out infinite" } : undefined}>
      <circle cx="24" cy="24" r="22" stroke="#00CFFF" strokeWidth="1"
        strokeDasharray="5 3" strokeOpacity=".4"
        style={{ animation: "logoOrbit 12s linear infinite", transformOrigin: "24px 24px", transformBox: "fill-box" }}/>
      <circle cx="24" cy="8"  r="4.5" fill="#FF5A36"/>
      <circle cx="24" cy="8"  r="7"   fill="#FF5A36" opacity=".18"/>
      <circle cx="10" cy="34" r="4.5" fill="#1F3D5C"/>
      <circle cx="10" cy="34" r="7"   fill="#1F3D5C" opacity=".18"/>
      <circle cx="38" cy="34" r="4.5" fill="#C9A227"/>
      <circle cx="38" cy="34" r="7"   fill="#C9A227" opacity=".18"/>
      <circle cx="24" cy="36" r="3"   fill="#00CFFF"/>
      <circle cx="24" cy="36" r="5"   fill="#00CFFF" opacity=".2"/>
      <path d="M24 12.5 L24 34 M24 34 L11 33 M24 34 L37 33"
        stroke="#00CFFF" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}

// ---------------------------------------------------------------
// INTRO SCREEN — neural circuit face (matches the AI reference image)
// ---------------------------------------------------------------
const BINARY_LINES = Array.from({ length: 30 }, () =>
  Array.from({ length: 36 }, () => Math.random() > .5 ? "1" : "0").join(" ")
);

function IntroScreen({ onEnter, userName }) {
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const [tick, setTick] = useState(0);
  const [stage, setStage] = useState("tap"); // "tap" | "face"
  const [speaking, setSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");

  const welcomeMsg = userName
    ? `Welcome back, ${userName}. I am Junction AI — your gateway to the UAE hub for real estate, professional services, investors and developers.`
    : `Welcome to Junction — normalizing professional services across the UAE. Carpenters, barbers, AC technicians, electricians and more — all verified, all at standard prices. One tap, any area, any service.`;

  // Server rack blink ticker
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 90);
    return () => clearInterval(id);
  }, []);

  // Mouth animation
  useEffect(() => {
    if (!speaking) { setMouthOpen(false); return; }
    const id = setInterval(() => setMouthOpen(m => !m), 160);
    return () => clearInterval(id);
  }, [speaking]);

  // Typewriter
  useEffect(() => {
    if (!speaking) return;
    let i = 0;
    setWelcomeText("");
    const id = setInterval(() => {
      i++;
      setWelcomeText(welcomeMsg.slice(0, i));
      if (i >= welcomeMsg.length) clearInterval(id);
    }, 34);
    return () => clearInterval(id);
  }, [speaking]);

  // Called after user taps — browser now allows audio
  const startFace = () => {
    setStage("face");
    setTimeout(() => {
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(welcomeMsg);
      utter.rate = 0.88;
      utter.pitch = 1.15;
      utter.volume = 1;
      // Load voices and pick female English
      const trySpeak = () => {
        const voices = window.speechSynthesis.getVoices();
        const female = voices.find(v =>
          /samantha|karen|victoria|moira|fiona|allison|ava|susan|zira|hazel|google uk english female/i.test(v.name)
        ) || voices.find(v => v.lang.startsWith("en") && /female/i.test(v.name))
          || voices.find(v => v.lang.startsWith("en"))
          || voices[0];
        if (female) utter.voice = female;
        utter.onstart = () => setSpeaking(true);
        utter.onend = () => { setSpeaking(false); setMouthOpen(false); };
        utter.onerror = () => { setSpeaking(false); setMouthOpen(false); };
        window.speechSynthesis.speak(utter);
      };
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) trySpeak();
      else window.speechSynthesis.addEventListener("voiceschanged", trySpeak, { once: true });
    }, 400);
  };

  const enter = (q) => {
    window.speechSynthesis?.cancel();
    setClosing(true);
    setTimeout(() => onEnter(q), 300);
  };

  // ── STAGE 1: TAP TO START ─────────────────────────
  if (stage === "tap") {
    return (
      <div
        className="fixed inset-0 z-50 flex flex-col items-center justify-center"
        style={{ background: "#020D1A", cursor: "pointer" }}
        onClick={startFace}
      >
        <style>{FONT_IMPORT}</style>
        {/* scrolling binary bg */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" style={{ opacity: .13 }}>
          <div style={{ animation: "dataScroll 22s linear infinite",
            fontFamily: "IBM Plex Mono,monospace", fontSize: "8px", lineHeight: "1.7",
            color: "#00CFFF", letterSpacing: ".08em", whiteSpace: "nowrap" }}>
            {[...BINARY_LINES, ...BINARY_LINES].map((row, i) => (
              <div key={i} style={{ opacity: i % 5 === 0 ? ".9" : ".5" }}>{row}</div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center">
          {/* Logo */}
          <div className="flex items-center gap-3"
            style={{ animation: "logoCoreGlow 2.4s ease-in-out infinite" }}>
            <JunctionLogoMark size={52} glow />
            <h1 style={{ fontFamily: "Space Grotesk,sans-serif", color: "#00CFFF",
              textShadow: "0 0 28px #00CFFF99, 0 0 56px #00CFFF44",
              letterSpacing: ".14em", fontSize: "36px", fontWeight: 800 }}>
              JUNCTION
            </h1>
          </div>

          {/* Tagline */}
          <div style={{ fontFamily: "IBM Plex Mono,monospace", color: "#3A8AAA",
            fontSize: "11px", letterSpacing: ".12em", lineHeight: "2" }}>
            REAL ESTATE &nbsp;·&nbsp; PROFESSIONAL SERVICES<br/>
            INVESTORS &nbsp;·&nbsp; DEVELOPERS &nbsp;·&nbsp; UAE
          </div>

          {/* Vision statement */}
          <p className="max-w-xs text-sm" style={{ color: "#5A9AAA", lineHeight: "1.7",
            fontFamily: "IBM Plex Mono,monospace", fontSize: "11px" }}>
            The platform that normalizes professional services across the UAE —
            like Talabat did for food, like Careem did for transport.
            One tap. Any area. Verified professionals. Standard pricing.
          </p>

          {/* Tap prompt — pulsing */}
          <div className="mt-4 flex flex-col items-center gap-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{
                border: "2px solid #00CFFF",
                animation: "eyeGlow 2s ease-in-out infinite",
                background: "rgba(0,207,255,0.06)",
              }}
            >
              <div style={{ fontFamily: "IBM Plex Mono,monospace", color: "#00CFFF",
                fontSize: "10px", textAlign: "center", lineHeight: "1.4", letterSpacing: ".05em" }}>
                TAP<br/>TO<br/>START
              </div>
            </div>
            <p style={{ color: "#1A5A70", fontSize: "10px",
              fontFamily: "IBM Plex Mono,monospace", letterSpacing: ".08em" }}>
              JUNCTION AI WILL GREET YOU
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── STAGE 2: SPEAKING FACE ───────────────────────
  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden flex flex-col items-center justify-center"
      style={{ background: "#020D1A", animation: closing ? "aiFadeOut .3s ease forwards" : "none" }}
    >
      {/* scrolling binary background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" style={{ opacity: .18 }}>
        <div style={{ animation: "dataScroll 20s linear infinite", fontFamily: "IBM Plex Mono,monospace",
          fontSize: "8px", lineHeight: "1.7", color: "#00CFFF", letterSpacing: ".08em", whiteSpace: "nowrap" }}>
          {[...BINARY_LINES, ...BINARY_LINES].map((row, i) => (
            <div key={i} style={{ opacity: i % 5 === 0 ? ".9" : ".5" }}>{row}</div>
          ))}
        </div>
      </div>

      {/* server racks */}
      {[0, 1].map(si => (
        <div key={si} className="absolute top-0 bottom-0 pointer-events-none"
          style={{ [si === 0 ? "left" : "right"]: "0", width: "52px",
            background: "linear-gradient(to bottom,#020D1A,#061220 40%,#020D1A)",
            [si === 0 ? "borderRight" : "borderLeft"]: "1px solid #0A3050" }}>
          {Array.from({ length: 14 }, (_, i) => (
            <div key={i} className="mx-1.5 my-1.5 rounded-sm flex items-center gap-1 px-1"
              style={{ height: 13, background: "#0A1E30", border: "1px solid #0D3050" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", transition: "all .09s",
                background: Math.sin(tick * .09 + i + si) > .35 ? "#00CFFF" : "#0A3050",
                boxShadow: Math.sin(tick * .09 + i + si) > .35 ? "0 0 5px #00CFFF" : "none" }}/>
              <div style={{ flex: 1, height: 1, background: "#0D3050", borderRadius: 1 }}/>
              <div style={{ width: 4, height: 4, borderRadius: "50%", transition: "all .09s",
                background: Math.sin(tick * .07 + i * 1.4 + si) > .5 ? "#FF5A36" : "#0A3050" }}/>
            </div>
          ))}
        </div>
      ))}

      <div className="relative z-10 flex flex-col items-center w-full px-4">
        {/* LOGO above face */}
        <div className="flex items-center gap-3 mb-3"
          style={{ animation: "logoCoreGlow 2.4s ease-in-out infinite" }}>
          <JunctionLogoMark size={40} glow />
          <h1 style={{ fontFamily: "Space Grotesk,sans-serif", color: "#00CFFF",
            textShadow: "0 0 24px #00CFFF99, 0 0 48px #00CFFF44",
            letterSpacing: ".12em", fontSize: "28px", fontWeight: 800 }}>
            JUNCTION
          </h1>
        </div>

        {/* THE NEURAL FACE */}
        <svg width="250" height="300" viewBox="0 0 290 360">
          <defs>
            <radialGradient id="faceG" cx="50%" cy="42%" r="55%">
              <stop offset="0%" stopColor="#0E2A44"/>
              <stop offset="60%" stopColor="#071828"/>
              <stop offset="100%" stopColor="#020D1A"/>
            </radialGradient>
            <radialGradient id="eyeGL" cx="38%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#C8F0FF"/>
              <stop offset="30%" stopColor="#00CFFF"/>
              <stop offset="68%" stopColor="#006EFF"/>
              <stop offset="100%" stopColor="#001844"/>
            </radialGradient>
            <radialGradient id="eyeGR" cx="38%" cy="38%" r="65%">
              <stop offset="0%" stopColor="#C8F0FF"/>
              <stop offset="30%" stopColor="#00CFFF"/>
              <stop offset="68%" stopColor="#006EFF"/>
              <stop offset="100%" stopColor="#001844"/>
            </radialGradient>
            <filter id="glow2"><feGaussianBlur stdDeviation="3.5" result="b"/>
              <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>

          <ellipse cx="145" cy="192" rx="112" ry="160" fill="none" stroke="#006EFF"
            strokeWidth="1" strokeOpacity=".2" filter="url(#glow2)"/>
          <ellipse cx="145" cy="192" rx="108" ry="158" fill="url(#faceG)"/>
          <ellipse cx="145" cy="192" rx="108" ry="158" fill="none"
            stroke="#00CFFF" strokeWidth="1.2" strokeOpacity=".55"/>

          {/* circuit lines */}
          <line x1="145" y1="36" x2="145" y2="94" stroke="#00CFFF" strokeWidth=".9"
            strokeOpacity=".7" strokeDasharray="120"
            style={{ animation: "circuitFlow 3.2s ease-in-out infinite" }}/>
          <path d="M84 72 L108 64 L145 62 L182 64 L206 72" stroke="#00CFFF"
            strokeWidth=".8" strokeOpacity=".55" fill="none" strokeDasharray="160"
            style={{ animation: "circuitFlow 4s ease-in-out .6s infinite" }}/>
          <path d="M38 148 L54 156 L58 184 L50 220 L40 252" stroke="#00CFFF"
            strokeWidth=".8" strokeOpacity=".5" fill="none" strokeDasharray="140"
            style={{ animation: "circuitFlow 5.5s ease-in-out 1s infinite" }}/>
          <path d="M252 148 L236 156 L232 184 L240 220 L250 252" stroke="#00CFFF"
            strokeWidth=".8" strokeOpacity=".5" fill="none" strokeDasharray="140"
            style={{ animation: "circuitFlow 5.5s ease-in-out 2s infinite" }}/>

          {/* sensor dots */}
          {[[54,164],[236,164],[52,208],[238,208]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill="#00CFFF"
              style={{ animation: `neuralPulse ${2+i*.45}s ease-in-out ${i*.3}s infinite`,
                filter: "drop-shadow(0 0 5px #00CFFF)" }}/>
          ))}

          {/* forehead chips */}
          {[[108,82],[145,76],[182,82]].map(([cx,cy],i) => (
            <g key={i}>
              <circle cx={cx} cy={cy} r="3.8" fill="#071828" stroke="#00CFFF" strokeWidth=".8"/>
              <circle cx={cx} cy={cy} r="1.6" fill="#00CFFF"
                style={{ animation: `neuralPulse ${2.5+i*.5}s ease-in-out ${i*.4}s infinite` }}/>
            </g>
          ))}

          {/* binary text */}
          {[[46,200,"10110100"],[46,216,"01001101"],[200,200,"01101001"],[200,216,"10010110"]].map(([x,y,t],i)=>(
            <text key={i} x={x} y={y} fontFamily="IBM Plex Mono,monospace" fontSize="6"
              fill="#00CFFF" fillOpacity=".38" style={{ userSelect: "none" }}>{t}</text>
          ))}

          <text x="60" y="138" fontFamily="IBM Plex Mono,monospace" fontSize="5.5"
            fill="#00CFFF" fillOpacity=".5" style={{ userSelect: "none" }}>LOGIC MATRIX</text>
          <text x="178" y="138" fontFamily="IBM Plex Mono,monospace" fontSize="5.5"
            fill="#00CFFF" fillOpacity=".5" style={{ userSelect: "none" }}>FEATURE MAP</text>

          {/* eyebrows */}
          <path d="M76 132 Q100 118 124 128" stroke="#00CFFF" strokeWidth="2.2"
            fill="none" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px #00CFFF)" }}/>
          <path d="M166 128 Q190 118 214 132" stroke="#00CFFF" strokeWidth="2.2"
            fill="none" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px #00CFFF)" }}/>

          {/* eyes */}
          <g style={{ animation: "aiBlink 6s infinite", transformOrigin: "100px 160px" }}>
            <ellipse cx="100" cy="160" rx="28" ry="16" fill="#041020"/>
            <circle cx="100" cy="160" r="14" fill="url(#eyeGL)"
              style={{ animation: "eyeGlow 3s ease-in-out infinite" }}/>
            <circle cx="100" cy="160" r="5.5" fill="#000820"/>
            <circle cx="95" cy="155" r="3" fill="#fff" opacity=".88"/>
            <ellipse cx="100" cy="160" rx="28" ry="16" fill="none"
              stroke="#00CFFF" strokeWidth=".9" strokeOpacity=".75"/>
          </g>
          <g style={{ animation: "aiBlink 6s infinite", transformOrigin: "190px 160px" }}>
            <ellipse cx="190" cy="160" rx="28" ry="16" fill="#041020"/>
            <circle cx="190" cy="160" r="14" fill="url(#eyeGR)"
              style={{ animation: "eyeGlow 3s ease-in-out .5s infinite" }}/>
            <circle cx="190" cy="160" r="5.5" fill="#000820"/>
            <circle cx="185" cy="155" r="3" fill="#fff" opacity=".88"/>
            <ellipse cx="190" cy="160" rx="28" ry="16" fill="none"
              stroke="#00CFFF" strokeWidth=".9" strokeOpacity=".75"/>
          </g>

          {/* nose */}
          <path d="M145 178 L137 232 Q145 242 153 232" stroke="#00CFFF"
            strokeWidth="1" strokeOpacity=".45" fill="none" strokeLinecap="round"/>
          <circle cx="145" cy="241" r="3" fill="#00CFFF" opacity=".55"
            style={{ filter: "drop-shadow(0 0 4px #00CFFF)" }}/>

          {/* ANIMATED LIPS */}
          {mouthOpen ? (
            <ellipse cx="145" cy="280" rx="26" ry="12" fill="#00CFFF" opacity=".14"
              stroke="#00CFFF" strokeWidth="1.2" strokeOpacity=".8"/>
          ) : (
            <path d="M121 278 Q145 270 169 278 Q156 294 145 296 Q134 294 121 278 Z"
              fill="#071828" stroke="#00CFFF" strokeWidth=".9" strokeOpacity=".65"/>
          )}
          <path d="M123 278 Q145 272 167 278" stroke="#00CFFF"
            strokeWidth=".8" fill="none" strokeOpacity=".5"/>

          {/* sound waves when speaking */}
          {speaking && [1, 2, 3].map(i => (
            <ellipse key={i} cx={145} cy={283} rx={26 + i * 12} ry={3 + i * 3}
              fill="none" stroke="#00CFFF" strokeWidth=".7"
              style={{ opacity: 1 - i * .28,
                animation: `neuralPulse ${.55 + i * .18}s ease-in-out ${i * .1}s infinite` }}/>
          ))}

          {/* scan line */}
          <rect x="37" y="0" width="216" height="2.5" rx="1.2"
            fill="#00CFFF" opacity=".2"
            style={{ animation: "scanLine 5s ease-in-out 1.2s infinite" }}/>
        </svg>

        {/* typewriter text */}
        <div className="mt-2 mb-3 min-h-8 max-w-xs text-center px-2"
          style={{ fontFamily: "IBM Plex Mono,monospace", fontSize: "11px",
            color: "#4AAFCC", lineHeight: "1.6", letterSpacing: ".03em" }}>
          {welcomeText ? (
            <>{welcomeText}{speaking && <span style={{ color: "#00CFFF" }}>▌</span>}</>
          ) : (
            <span style={{ color: "#1A5A70", animation: "neuralPulse 1.5s ease-in-out infinite" }}>
              JUNCTION AI ONLINE…
            </span>
          )}
        </div>

        {/* input + enter */}
        <div className="w-full max-w-xs flex flex-col gap-2.5">
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(0,207,255,0.06)", border: "1px solid #00CFFF33" }}>
            <Search size={14} style={{ color: "#00CFFF" }}/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && enter(query)}
              placeholder="What are you looking for today?"
              className="text-sm outline-none flex-1 bg-transparent"
              style={{ color: "#B8EEFF", fontFamily: "IBM Plex Mono,monospace" }}/>
          </div>
          <button onClick={() => enter(query)}
            className="text-sm font-bold py-2.5 rounded-xl tracking-widest"
            style={{ background: "linear-gradient(135deg,#00CFFF,#0E2A44)", color: "#fff",
              fontFamily: "Space Grotesk,sans-serif", boxShadow: "0 0 22px rgba(0,207,255,.45)" }}>
            ENTER JUNCTION
          </button>
        </div>
      </div>
    </div>
  );
}



export default function App() {
  const [tab, setTab] = useState("feed");
  const [showPostModal, setShowPostModal] = useState(false);
  const [verifyStatuses, setVerifyStatuses] = useState({});
  const [properties, setProperties] = useState(PROPERTIES);
  const [phase, setPhase] = useState("intro");
  const [aiAutoQuery, setAiAutoQuery] = useState(null);

  // Demo user — in production this comes from auth (JWT / session)
  // Change this to null to see the "new visitor" welcome message
  const [currentUser] = useState({ name: "Barron" });

  const initialViews = useMemo(
    () => Object.fromEntries(PROPERTIES.map((p) => [p.id, p.views])),
    []
  );
  const liveViews = useLiveViews(initialViews);

  const handlePublish = (newProperty) => {
    setProperties((prev) => [newProperty, ...prev]);
    setShowPostModal(false);
    setTab("feed");
  };

  if (phase === "intro") {
    return (
      <>
        <style>{FONT_IMPORT}</style>
        <IntroScreen
          userName={currentUser?.name || null}
          onEnter={(q) => {
            if (q && q.trim()) setAiAutoQuery(q.trim());
            setPhase("main");
          }}
        />
      </>
    );
  }

  return (
    <div style={{ background: T.paper, minHeight: "100vh", fontFamily: "'Inter', sans-serif" }}>
      <style>{FONT_IMPORT}</style>

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-4 md:px-6 py-3 sticky top-0 z-10"
        style={{ background: "#020D1A", borderBottom: "1px solid #00CFFF18" }}
      >
        <Logo light />
        <nav className="hidden md:flex items-center gap-1">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg"
                style={{
                  color: isActive ? T.ink : T.paper,
                  background: isActive ? T.paper : "transparent",
                }}
              >
                <Icon size={15} /> {n.label}
              </button>
            );
          })}
        </nav>
        <div className="flex items-center gap-2">
          {currentUser && (
            <div className="hidden md:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg"
              style={{ background: "rgba(0,207,255,0.08)", color: "#00CFFF",
                border: "1px solid #00CFFF22", fontFamily: "'IBM Plex Mono',monospace" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2DBD8A",
                display: "inline-block", boxShadow: "0 0 6px #2DBD8A" }}/>
              {currentUser.name}
            </div>
          )}
          <button
            onClick={() => setShowPostModal(true)}
            className="text-xs font-bold px-3 py-1.5 rounded-lg"
            style={{ background: "linear-gradient(135deg,#00CFFF,#5B9EFF)", color: "#04111F",
              fontFamily: "'Space Grotesk',sans-serif",
              boxShadow: "0 0 14px rgba(0,207,255,.4)" }}
          >
            Post a property
          </button>
        </div>
      </div>
      <UAEFlagStripe height={3} rounded={false} />

      {/* Content */}
      {tab === "reels" ? (
        <div key={tab} className="tab-fade fixed inset-x-0 top-14 bottom-16 md:bottom-0">
          <ReelsView liveViews={liveViews} properties={properties} onChat={() => setTab("messages")} />
        </div>
      ) : (
        <div key={tab} className="tab-fade pb-16 md:pb-0">
          {tab === "feed" && <FeedView liveViews={liveViews} properties={properties} />}
          {tab === "services" && (
            <ServicesView providers={SERVICE_PROVIDERS} statuses={verifyStatuses} onChat={() => setTab("messages")} />
          )}
          {tab === "vision2040" && <Vision2040View properties={properties} liveViews={liveViews} />}
          {tab === "investor" && <InvestorZone liveViews={liveViews} properties={properties} />}
          {tab === "messages" && <MessagesView />}
          {tab === "business" && <BusinessPageView properties={properties} />}
          {tab === "transactions" && <TransactionsView />}
          {tab === "dashboard" && <DashboardView />}
          {tab === "verify" && <VerifyView statuses={verifyStatuses} setStatuses={setVerifyStatuses} />}
        </div>
      )}

      {showPostModal && (
        <PostPropertyModal
          onClose={() => setShowPostModal(false)}
          statuses={verifyStatuses}
          onPublish={handlePublish}
        />
      )}

      {tab !== "reels" && (
        <AIAssistant
          properties={properties}
          threads={CHAT_THREADS}
          onOpenPost={() => setShowPostModal(true)}
          autoQuery={aiAutoQuery}
        />
      )}

      {/* Mobile bottom nav */}
      <div
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around py-2 border-t overflow-x-auto"
        style={{ background: "#fff", borderColor: T.line }}
      >
        {NAV.map((n) => {
          const Icon = n.icon;
          const isActive = tab === n.id;
          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className="flex flex-col items-center gap-0.5 text-[11px] font-medium px-2"
              style={{ color: isActive ? T.navy : T.sub }}
            >
              <Icon size={18} />
              {n.label === "Investor zone" ? "Investor" : n.label === "Get verified" ? "Verify" : n.label === "Business page" ? "Business" : n.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
