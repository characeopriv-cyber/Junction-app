import React, { useState, useEffect, useMemo, useRef } from "react";

// ---------------------------------------------------------------
// Junction AI — real call path
// The browser never talks to Anthropic directly (no API key belongs
// in client code). It calls our own serverless endpoint at /api/assistant
// (see /api/assistant.js at the project root), which holds the key
// server-side and forwards the request. Works on Vercel out of the box
// as long as ANTHROPIC_API_KEY is set in the project's env vars.
// ---------------------------------------------------------------
async function callJunctionAI({ system, messages, maxTokens = 600 }) {
  const response = await fetch("/api/assistant", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ system, messages, maxTokens }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error || `Assistant error (${response.status})`);
  }
  const data = await response.json();
  return data.reply || "";
}

import {
  Search,
  AtSign,
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
  Settings,
  Moon,
  Bell,
  Type,
  Languages,
  Briefcase,
  GraduationCap,
  BadgeCheck,
  HandCoins,
  Calendar,
  Ticket,
  Utensils,
  PartyPopper,
  Music,
  Gift,
  Megaphone,
  QrCode,
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
  panel: "#EEF2F6",     // soft card panel — slightly deeper than paper, used for stat/info cards
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
@keyframes faceRingDraw {
  from { stroke-dashoffset: 900; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: .55; }
}
@keyframes faceTraceDraw {
  from { stroke-dashoffset: 300; opacity: 0; }
  to { stroke-dashoffset: 0; opacity: 1; }
}
@keyframes faceFeatureIn {
  from { opacity: 0; transform: scale(.4); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes faceGroupIn {
  from { opacity: 0; transform: scale(.88); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes faceTurn3D {
  0% { opacity: 0; transform: rotateY(-42deg) rotateX(8deg) translateZ(-120px) scale(.82); }
  60% { opacity: 1; }
  100% { opacity: 1; transform: rotateY(0deg) rotateX(0deg) translateZ(0) scale(1); }
}
@keyframes logoCompleteIn {
  from { opacity: 0; transform: translateY(-6px) scale(.9); filter: drop-shadow(0 0 0px #00CFFF); }
  to { opacity: 1; transform: translateY(0) scale(1); filter: drop-shadow(0 0 14px #00CFFF); }
}
@keyframes particleConverge {
  0% { opacity: 0; transform: translate3d(var(--sx), var(--sy), var(--sz)) rotate(var(--srot)) scale(.3); }
  55% { opacity: var(--op); }
  82% { transform: translate3d(0,0,0) rotate(0deg) scale(1.15); }
  100% { opacity: var(--op); transform: translate3d(0,0,0) rotate(0deg) scale(1); }
}
@keyframes energyBurst {
  0% { opacity: .9; transform: scale(.3); stroke-width: 3; }
  100% { opacity: 0; transform: scale(1.35); stroke-width: .3; }
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
@keyframes listeningEdge {
  0%,100% { opacity:.15; }
  50% { opacity:.85; }
}
@keyframes ghostFlicker {
  0%,100% { opacity:1; }
  50% { opacity:.45; }
}
@keyframes auraGlow {
  0%,100% { opacity:.35; transform:scale(1); }
  50% { opacity:.75; transform:scale(1.06); }
}
`;

// ---------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------

const PROPERTIES = [
  {
    id: "p1",
    ghostRisk: 0.05,
    propertyAura: "cyan",
    sustainabilityScore: 88,
    listingChain: [
      { date: "Jan 2021", listedBy: "Faisal Al Rashid", type: "OWNER_LISTING", price: 1850000 },
      { date: "Mar 2023", listedBy: "BlueSky Realty RERA#4421", type: "LICENSED_BROKER", price: 2100000 },
      { date: "Nov 2024", listedBy: "BlueSky Realty RERA#4421", type: "LICENSED_BROKER", price: 2450000 },
    ],
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
    grad: ["#3A6FA0", "#1F3D5C"],
  },
  {
    id: "p2",
    ghostRisk: 0.74,
    propertyAura: "amber",
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
    ghostRisk: 0.12,
    propertyAura: "cyan",
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
    ghostRisk: 0.03,
    propertyAura: "gold",
    sustainabilityScore: 91,
    listingChain: [
      { date: "Jun 2019", listedBy: "Gulf Developers Ltd", type: "DEVELOPER", price: 3200000 },
      { date: "Feb 2022", listedBy: "Sarah M.", type: "REFERRAL_PARTNER", price: 3900000 },
      { date: "Sep 2024", listedBy: "Prime Properties RERA#2209", type: "LICENSED_BROKER", price: 4750000 },
    ],
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
    grad: ["#2C5278", "#14191F"],
  },
  {
    id: "p5",
    ghostRisk: 0.09,
    propertyAura: "green",
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
    ghostRisk: 0.48,
    propertyAura: "amber",
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
    ghostRisk: 0.02,
    propertyAura: "coral",
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
    ghostRisk: 0.91,
    propertyAura: "amber",
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
    ghostRisk: 0.04,
    propertyAura: "gold",
    sustainabilityScore: 95,
    listingChain: [
      { date: "Dec 2022", listedBy: "Emaar Properties", type: "DEVELOPER", price: 7200000 },
      { date: "Aug 2025", listedBy: "Harbor Homes RERA#5512", type: "LICENSED_BROKER", price: 8900000 },
    ],
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
// ---------------------------------------------------------------
// REACH / TARGETING — "which country or region should this post
// reach?" algorithm offered when publishing a property or service.
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// LANGUAGES — supported UI languages. The app auto-detects the
// visitor's browser/device language on first load (see App's
// detectLanguage()) and lets them override it from Settings.
// ---------------------------------------------------------------
const LANGUAGES = [
  { code: "en", label: "English", native: "English" },
  { code: "ar", label: "Arabic", native: "العربية" },
  { code: "fr", label: "French", native: "Français" },
  { code: "hi", label: "Hindi", native: "हिन्दी" },
  { code: "ur", label: "Urdu", native: "اردو" },
  { code: "ru", label: "Russian", native: "Русский" },
  { code: "zh", label: "Chinese", native: "中文" },
];

function detectLanguage() {
  try {
    const browserLangs = navigator.languages || [navigator.language || "en"];
    for (const bl of browserLangs) {
      const code = bl.slice(0, 2).toLowerCase();
      if (LANGUAGES.some((l) => l.code === code)) return code;
    }
  } catch {
    // ignore — fall back to English
  }
  return "en";
}

// ---------------------------------------------------------------
// JUNCTION WORK — Job listings and job seekers
// Zero agency fees for seekers. One month salary commission
// taken from the hiring company ONLY after successful placement.
// Verified companies post jobs. Verified citizens apply.
// No money ever taken from the job seeker.
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// JUNCTION SECTORS — the full UAE job-market taxonomy. Every sector
// that meaningfully employs people in the UAE gets a slot here, not
// just real-estate-adjacent trades. This is what candidates pick from
// when they build a profile, and what the matching algorithm scores
// against — it's real classification data, not placeholder categories.
// ---------------------------------------------------------------
const JUNCTION_SECTORS = [
  {
    id: "real-estate", name: "Real Estate & Property",
    titles: ["Real Estate Agent","Property Manager","Facilities Manager","Leasing Consultant","Community Manager","Valuation Surveyor","Real Estate Analyst","Broker Manager"],
  },
  {
    id: "construction", name: "Construction & Engineering",
    titles: ["Civil Engineer","MEP Engineer","Site Supervisor","Quantity Surveyor","Project Manager (Construction)","Architect","Structural Engineer","Safety Officer (HSE)","AC Technician","Electrician","Plumber","Carpenter","Painter","Building Supervisor","Surveyor","Draftsman"],
  },
  {
    id: "aviation", name: "Aviation & Airports",
    titles: ["Cabin Crew","Pilot","Air Traffic Controller","Ground Operations Officer","Airport Security Officer","Aircraft Maintenance Engineer","Ramp Agent","Cargo Operations Officer","Customer Service Agent (Airport)","Aviation Safety Officer","Ground Handling Supervisor"],
  },
  {
    id: "maritime", name: "Maritime & Seaports",
    titles: ["Port Operations Officer","Marine Engineer","Ship Captain / Master","Deck Officer","Crane Operator (Port)","Customs & Freight Officer","Terminal Operations Manager","Marine Surveyor","Stevedore","Logistics Coordinator (Port)"],
  },
  {
    id: "tech-ai", name: "AI, Technology & Software",
    titles: ["Software Developer","AI/ML Engineer","Data Scientist","Data Analyst","DevOps Engineer","Cybersecurity Analyst","Product Manager (Tech)","UX/UI Designer","Cloud Solutions Architect","QA Engineer","IT Support Specialist","Blockchain Developer"],
  },
  {
    id: "finance", name: "Banking & Finance",
    titles: ["Relationship Manager (Banking)","Financial Analyst","Accountant","Auditor","Compliance Officer","Investment Advisor","Risk Manager","Credit Analyst","Treasury Officer","Actuary","Insurance Underwriter"],
  },
  {
    id: "healthcare", name: "Healthcare & Medical",
    titles: ["Nurse","Doctor / Physician","Pharmacist","Dentist","Medical Lab Technician","Radiologist","Physiotherapist","Healthcare Administrator","Paramedic","Home Care Nurse","Dietitian"],
  },
  {
    id: "hospitality", name: "Hospitality & Tourism",
    titles: ["Hotel Manager","Front Desk Agent","Chef / Cook","Waiter / F&B Server","Housekeeping Supervisor","Concierge","Tour Guide","Event Planner","Travel Consultant","Barista","Guest Relations Officer"],
  },
  {
    id: "energy", name: "Oil, Gas & Energy",
    titles: ["Petroleum Engineer","Process Engineer","HSE Officer (Energy)","Rig Operator","Pipeline Technician","Renewable Energy Engineer","Energy Analyst","Refinery Operator","Solar Technician"],
  },
  {
    id: "government", name: "Government & Public Sector",
    titles: ["Government Relations Officer","Policy Analyst","Public Administrator","Municipality Officer","Immigration Officer","Customs Officer","Urban Planner","Public Sector Project Manager"],
  },
  {
    id: "retail", name: "Retail & E-commerce",
    titles: ["Retail Staff","Store Manager","Visual Merchandiser","E-commerce Manager","Category Manager","Buyer / Merchandiser","Customer Service Representative","Cashier","Sales Executive"],
  },
  {
    id: "logistics", name: "Logistics & Supply Chain",
    titles: ["Supply Chain Manager","Warehouse Supervisor","Driver","Fleet Manager","Procurement Officer","Freight Forwarder","Inventory Controller","Delivery Rider","Import/Export Coordinator"],
  },
  {
    id: "education", name: "Education",
    titles: ["Teacher","School Principal","Teaching Assistant","Curriculum Coordinator","University Lecturer","Education Counselor","Special Needs Educator","Nursery Caregiver"],
  },
  {
    id: "legal", name: "Legal",
    titles: ["Lawyer / Advocate","Legal Consultant","Paralegal","Contracts Manager","Notary","Compliance & Legal Officer","Legal Translator"],
  },
  {
    id: "media", name: "Media, Marketing & Creative",
    titles: ["Marketing Manager","Content Creator","Graphic Designer","Social Media Manager","Videographer / Photographer","PR Specialist","Copywriter","Brand Manager","Journalist"],
  },
  {
    id: "telecom", name: "Telecom & Utilities",
    titles: ["Network Engineer","Telecom Technician","Customer Support (Telecom)","Field Technician","Utilities Operations Officer"],
  },
  {
    id: "manufacturing", name: "Manufacturing & Industrial",
    titles: ["Production Supervisor","Quality Control Inspector","Machine Operator","Industrial Engineer","Warehouse Worker","Maintenance Technician"],
  },
  {
    id: "admin-hr", name: "Admin, HR & Corporate",
    titles: ["Admin / Secretary","HR Manager","Recruiter","Office Manager","Executive Assistant","Receptionist","Business Analyst"],
  },
  {
    id: "domestic-security", name: "Domestic, Security & General Services",
    titles: ["Security Guard","Cleaner","Nanny / Domestic Helper","Driver (Private)","Gardener","Pool Maintenance Technician","Pest Control Technician"],
  },
];

const JOB_CATEGORIES = JUNCTION_SECTORS.flatMap((s) => s.titles);

// Look up which sector a given job title belongs to — used by the
// matching algorithm and by profile setup to auto-suggest a sector.
function sectorForTitle(title) {
  return JUNCTION_SECTORS.find((s) => s.titles.includes(title)) || null;
}

const JOB_LISTINGS = [
  {
    id:"j1", type:"job",
    title:"Senior Real Estate Agent",
    company:"Skyline Properties",
    companyVerified:true,
    location:"Dubai Marina",
    emirate:"Dubai",
    salary:"AED 8,000–14,000/month + commission",
    category:"Real Estate Agent",
    posted:"2 hours ago",
    description:"We are looking for a RERA-certified agent with 3+ years experience in Dubai Marina and JBR. Fluent English required. Strong existing client network preferred.",
    requirements:["RERA Broker Card","3+ years UAE experience","English fluency","Own car"],
    applicants:14,
    urgent:true,
    grad:["#0E2A44","#163A5C"],
    agencyFee:"First month salary — charged to employer only. Zero cost to applicant.",
  },
  {
    id:"j2", type:"job",
    title:"Building Facilities Manager",
    company:"Emaar Facilities LLC",
    companyVerified:true,
    location:"Downtown Dubai",
    emirate:"Dubai",
    salary:"AED 12,000–18,000/month",
    category:"Facilities Manager",
    posted:"5 hours ago",
    description:"Manage day-to-day operations of a premium residential tower. Oversee maintenance teams, service contracts, and tenant relations.",
    requirements:["5+ years FM experience","Engineering background preferred","Arabic a plus"],
    applicants:8,
    urgent:false,
    grad:["#1F3D5C","#2C5278"],
    agencyFee:"First month salary — charged to employer only. Zero cost to applicant.",
  },
  {
    id:"j3", type:"job",
    title:"AC Technician — Residential Buildings",
    company:"Cool Breeze Maintenance",
    companyVerified:true,
    location:"Al Nahda, Sharjah",
    emirate:"Sharjah",
    salary:"AED 2,500–4,000/month + overtime",
    category:"AC Technician",
    posted:"1 day ago",
    description:"Experienced AC technician for residential and commercial buildings. Must have valid UAE driving licence.",
    requirements:["3+ years AC experience","UAE driving licence","Own tools preferred"],
    applicants:31,
    urgent:true,
    grad:["#1A3D5C","#0B2030"],
    agencyFee:"First month salary — charged to employer only. Zero cost to applicant.",
  },
  {
    id:"j4", type:"job",
    title:"Property Manager — Villa Community",
    company:"Nakheel Properties",
    companyVerified:true,
    location:"Palm Jumeirah",
    emirate:"Dubai",
    salary:"AED 15,000–22,000/month",
    category:"Property Manager",
    posted:"3 hours ago",
    description:"Manage a portfolio of premium villas. Handle leases, maintenance coordination, owner relations, and service provider management.",
    requirements:["RERA certification","5+ years property management","Excellent communication"],
    applicants:22,
    urgent:false,
    grad:["#7C3FA0","#3A1A50"],
    agencyFee:"First month salary — charged to employer only. Zero cost to applicant.",
  },
  {
    id:"j5", type:"job",
    title:"Senior Software Developer — PropTech",
    company:"Junction (Chara Enterprise)",
    companyVerified:true,
    location:"Dubai — Hybrid",
    emirate:"Dubai",
    salary:"AED 12,000–18,000/month + equity",
    category:"Software Developer",
    posted:"Just now",
    description:"Build the platform that is becoming the infrastructure of UAE real estate. React/Next.js/TypeScript/Prisma. You are not joining a company. You are co-building something that will outlast us both.",
    requirements:["8+ years production engineering","React/Next.js/TypeScript","PostgreSQL/Prisma","UAE-based or willing to relocate"],
    applicants:3,
    urgent:true,
    grad:["#FF5A36","#8A2E18"],
    agencyFee:"Equity offered. First month salary arrangement applies.",
  },
  {
    id:"j6", type:"job",
    title:"Chef — Private Residence",
    company:"Private Family (Verified)",
    companyVerified:true,
    location:"Emirates Hills",
    emirate:"Dubai",
    salary:"AED 5,000–7,000/month + accommodation",
    category:"Chef / Cook",
    posted:"6 hours ago",
    description:"Private family in Emirates Hills seeking experienced chef for daily meal preparation. Middle Eastern, Mediterranean, and international cuisine preferred.",
    requirements:["5+ years experience","References required","Live-in or live-out"],
    applicants:19,
    urgent:false,
    grad:["#1F7A4D","#0C3D28"],
    agencyFee:"First month salary — charged to employer only. Zero cost to applicant.",
  },
  {
    id:"j7", type:"job",
    title:"Security Guard — Residential Tower",
    company:"Shield Security Services",
    companyVerified:true,
    location:"JVC, Dubai",
    emirate:"Dubai",
    salary:"AED 1,800–2,500/month",
    category:"Security Guard",
    posted:"2 days ago",
    description:"Security guard for a residential tower in JVC. 12-hour shifts. SIRA licence required. Accommodation provided.",
    requirements:["SIRA licence","Physical fitness","Arabic or English"],
    applicants:44,
    urgent:false,
    grad:["#2C5278","#0E1A26"],
    agencyFee:"First month salary — charged to employer only. Zero cost to applicant.",
  },
];

const SEEKER_PROFILES = [
  {
    id:"s1", type:"seeker",
    name:"Mohammed Al Farsi",
    title:"Experienced Real Estate Agent",
    location:"Dubai",
    emirate:"Dubai",
    experience:"7 years",
    category:"Real Estate Agent",
    languages:["Arabic","English"],
    idVerified:true,
    posted:"1 hour ago",
    bio:"RERA-certified agent with 7 years experience in Dubai Marina, JBR, and Downtown. Strong investor network. Currently seeking new agency partnership.",
    grad:["#C9A227","#6A520F"],
    openTo:["Full time","Commission based"],
  },
  {
    id:"s2", type:"seeker",
    name:"Priya Nair",
    title:"Property & Facilities Manager",
    location:"Sharjah",
    emirate:"Sharjah",
    experience:"5 years",
    category:"Facilities Manager",
    languages:["English","Hindi","Malayalam"],
    idVerified:true,
    posted:"3 hours ago",
    bio:"Experienced property and FM professional. Managed 3 residential towers in Sharjah. Seeking role in Dubai with reputable developer or management company.",
    grad:["#2C5278","#14191F"],
    openTo:["Full time"],
  },
  {
    id:"s3", type:"seeker",
    name:"Jean-Pierre Mugisha",
    title:"Senior AC & HVAC Technician",
    location:"Dubai",
    emirate:"Dubai",
    experience:"9 years",
    category:"AC Technician",
    languages:["English","French","Arabic (basic)"],
    idVerified:true,
    posted:"5 hours ago",
    bio:"9 years in AC and HVAC maintenance across UAE residential and commercial projects. All major brands. Looking for stable building contract or FM company role.",
    grad:["#1A3D5C","#0B2030"],
    openTo:["Full time","Contract"],
  },
  {
    id:"s4", type:"seeker",
    name:"Amara Diallo",
    title:"Hospitality & Catering Professional",
    location:"Abu Dhabi",
    emirate:"Abu Dhabi",
    experience:"4 years",
    category:"Chef / Cook",
    languages:["French","English"],
    idVerified:false,
    posted:"1 day ago",
    bio:"Chef trained in French cuisine. 4 years in UAE hotels and private households. Passport in process. Happy to provide references from previous employers.",
    grad:["#1F7A4D","#0C3D28"],
    openTo:["Full time","Part time"],
  },
];

// ---------------------------------------------------------------
// JOB MATCHING ALGORITHM — deterministic scoring, not a demo stub.
// Runs a candidate's real profile against every open listing so a
// registered user sees relevant work without ever posting first.
// Once verified employer partners are live, their structured postings
// flow into the same `jobs` array this function already scores against
// — no change needed here when that happens.
// ---------------------------------------------------------------
function scoreJobForCandidate(candidate, job) {
  let score = 0;
  const reasons = [];

  if (!candidate?.category) return { score: 0, reasons: [] };

  if (job.category === candidate.category) {
    score += 50;
    reasons.push("Exact role match");
  } else {
    const candSector = sectorForTitle(candidate.category);
    const jobSector = sectorForTitle(job.category);
    if (candSector && jobSector && candSector.id === jobSector.id) {
      score += 20;
      reasons.push(`Same sector: ${jobSector.name}`);
    }
  }

  if (candidate.emirate && job.emirate && candidate.emirate === job.emirate) {
    score += 20;
    reasons.push(`Both based in ${candidate.emirate}`);
  }

  const candYears = parseInt(candidate.experience, 10) || 0;
  const reqText = (job.requirements || []).join(" ");
  const reqMatch = reqText.match(/(\d+)\+?\s*years?/i);
  const reqYears = reqMatch ? parseInt(reqMatch[1], 10) : 0;
  if (reqYears) {
    if (candYears >= reqYears) { score += 15; reasons.push(`Meets the ${reqYears}+ year requirement`); }
  } else {
    score += 5;
  }

  const candLangs = (candidate.languages || []).map((l) => l.toLowerCase().split(" ")[0]);
  const jobText = (reqText + " " + (job.description || "")).toLowerCase();
  if (candLangs.some((l) => l && jobText.includes(l))) {
    score += 10;
    reasons.push("Language match");
  }

  if (job.urgent) score += 5;

  return { score, reasons };
}

function matchJobsForCandidate(candidate, jobs, minScore = 20) {
  return jobs
    .filter((j) => j.type === "job")
    .map((j) => ({ job: j, ...scoreJobForCandidate(candidate, j) }))
    .filter((m) => m.score >= minScore)
    .sort((a, b) => b.score - a.score);
}

const REACH_OPTIONS = [
  { id: "local", label: "This emirate only", sub: "Shown mainly to people browsing in this emirate" },
  { id: "uae", label: "All of UAE", sub: "Shown across Dubai, Abu Dhabi, Sharjah and all emirates" },
  { id: "gcc", label: "GCC region", sub: "Extend reach to Saudi Arabia, Qatar, Kuwait, Bahrain, Oman" },
  { id: "global", label: "International", sub: "Visible to investors and buyers browsing from abroad" },
];

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
    id: "ghost",
    label: "Ghost Risk",
    icon: AlertTriangle,
    grad: ["#C9A227","#6A520F"],
    headline: "Ghost listing detector",
    sub: "Listings flagged by Junction AI as potentially unavailable based on inactivity patterns.",
    filter: (p) => p.ghostRisk > 0.4,
  },
  {
    id: "aiMatch",
    label: "AI Match",
    icon: Sparkles,
    grad: ["#006EFF", "#00CFFF"],
    headline: "Matched for you by Junction AI",
    sub: "Pure AI recommendations — no search, no filters. Junction learns what you want.",
    filter: (p) => p.visibility !== "investor",
  },
  {
    id: "history",
    label: "Track Record",
    icon: Activity,
    grad: ["#1F7A4D", "#0C3D28"],
    headline: "Verified property history",
    sub: "Listings with rent records, maintenance history and transaction chain — every move documented.",
    filter: (p) => p.listingChain && p.listingChain.length > 0,
  },
  {
    id: "prelaunch",
    label: "Pre-Launch",
    icon: Crown,
    grad: ["#7C3FA0", "#3A1A50"],
    headline: "Developer pre-launch access",
    sub: "Exclusive listings from UAE developers before they go to the general market.",
    filter: (p) => p.listedAs === "DEVELOPER",
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

// ---------------------------------------------------------------
// PASSPORT TIERS — three real access levels, not cosmetic badges.
// Every gate below (`hasAccess`) is actually checked somewhere in the
// app: Investor Zone, posting services/jobs, view analytics, and
// AI-assisted event organizing all read from this.
// ---------------------------------------------------------------
const PASSPORT_TIERS = {
  ordinary: {
    id: "ordinary", name: "Ordinary Passport", price: "Free", priceNote: "forever",
    color: "#7B8AA0",
    tagline: "Browse and connect across all of Junction.",
    features: [
      "Browse every listing, service, and job in the UAE",
      "Message verified agents, sellers, and employers",
      "Save favorites and get area-matched to your profile",
      "Organize basic events (self-serve, from AED 10)",
    ],
    access: {
      browse: true, message: true,
      postProperty: false, postService: false, postJob: false,
      investorZone: false, viewAnalytics: false,
      eventsAssisted: false, eventsConcierge: false, eventsMarketing: false,
      prioritySupport: false,
    },
  },
  services: {
    id: "services", name: "Services Passport", price: "AED 49", priceNote: "/month",
    color: "#1F7A4D",
    tagline: "For agents, sellers, and providers doing business on Junction.",
    features: [
      "Everything in Ordinary",
      "List properties, services, and job openings",
      "A Business Page with your own storefront",
      "Assisted event organizing (AI planning included)",
    ],
    access: {
      browse: true, message: true,
      postProperty: true, postService: true, postJob: true,
      investorZone: false, viewAnalytics: false,
      eventsAssisted: true, eventsConcierge: false, eventsMarketing: false,
      prioritySupport: false,
    },
  },
  investor: {
    id: "investor", name: "Investor Passport", price: "AED 149", priceNote: "/month",
    color: "#C9A227",
    tagline: "Full access — off-market deals, analytics, and white-glove event concierge.",
    features: [
      "Everything in Services",
      "Full Investor Zone — off-market & pre-launch deals",
      "See view analytics on everything you post",
      "AI event concierge — Junction can contact venues for you",
      "Priority placement in job & candidate matching",
      "Priority support",
    ],
    access: {
      browse: true, message: true,
      postProperty: true, postService: true, postJob: true,
      investorZone: true, viewAnalytics: true,
      eventsAssisted: true, eventsConcierge: true, eventsMarketing: true,
      prioritySupport: true,
    },
  },
};

function passportTierOf(user) {
  if (user?.isAdmin) return "investor"; // admins always see the top tier's UI
  return PASSPORT_TIERS[user?.passportTier] ? user.passportTier : "ordinary";
}
function hasAccess(user, key) {
  if (user?.isAdmin) return true; // admin/god-mode: every gate is open
  return !!PASSPORT_TIERS[passportTierOf(user)]?.access?.[key];
}

// Passport header backgrounds — 'junction-default' (the animated mark
// theme) is what everyone starts with; the rest are simple presets so
// people can make their Passport feel like their own without needing
// to upload anything.
const BACKGROUND_PRESETS = [
  { id: "junction-default", name: "Junction", swatch: "#0E2A44", css: "linear-gradient(135deg,#0E2A44,#163A5C)" },
  { id: "desert-gold", name: "Desert Gold", swatch: "#C9A227", css: "linear-gradient(135deg,#8A6A1E,#C9A227)" },
  { id: "skyline-night", name: "Skyline Night", swatch: "#04111F", css: "linear-gradient(135deg,#04111F,#0E2A44,#00CFFF)" },
  { id: "marina-teal", name: "Marina Teal", swatch: "#0E5C5C", css: "linear-gradient(135deg,#0E3D3D,#0E5C5C,#1FA8A8)" },
  { id: "falcon-crimson", name: "Falcon", swatch: "#8A1E2E", css: "linear-gradient(135deg,#5C0E18,#8A1E2E)" },
];

// ---------------------------------------------------------------
// UAE-THEMED REACTIONS — Connect's emoji set nods to the country and
// to Junction itself rather than being a generic emoji picker.
// ---------------------------------------------------------------
const UAE_REACTIONS = [
  { e: "🇦🇪", label: "UAE" },
  { e: "🦅", label: "Falcon" },
  { e: "🐪", label: "Camel" },
  { e: "🌴", label: "Palm" },
  { e: "🏙️", label: "Skyline" },
  { e: "☕", label: "Dallah" },
  { e: "🌙", label: "Crescent" },
  { e: "💎", label: "Gold" },
  { e: "🚀", label: "Future" },
  { e: "🤝", label: "Deal" },
  { e: "🔥", label: "Fire" },
  { e: "❤️", label: "Love" },
];

// ---------------------------------------------------------------
// PASSPORT AVATAR — default identity when no photo is set: an
// animated Junction mark plus the person's role, instead of a blank
// circle or random initials. Swaps to their real photo once uploaded.
// ---------------------------------------------------------------
function PassportAvatar({ user, size = 40 }) {
  const roleLabels = { client: "Client", agent: "Agent", service: "Service", investor: "Investor", work: "Work" };
  const role = roleLabels[user?.roleLabel] || (hasAccess(user, "investorZone") ? "Investor" : hasAccess(user, "postService") ? "Service" : "Client");
  if (user?.avatarUrl) {
    return (
      <img src={user.avatarUrl} alt={user.name || "avatar"} width={size} height={size}
        className="rounded-full object-cover shrink-0" style={{ width: size, height: size }} />
    );
  }
  return (
    <div className="relative rounded-full flex items-center justify-center shrink-0 overflow-hidden"
      style={{ width: size, height: size, background: "linear-gradient(135deg,#0E2A44,#163A5C)" }}>
      <div className="absolute inset-0" style={{ animation: "listeningEdge 4s ease-in-out infinite", background: "radial-gradient(circle,rgba(0,207,255,0.35),transparent 70%)" }} />
      <span className="relative font-bold" style={{ fontSize: size * 0.4, color: "#00CFFF", fontFamily: "'Space Grotesk',sans-serif" }}>J</span>
      {size >= 32 && (
        <span className="absolute bottom-0 left-0 right-0 text-center font-semibold"
          style={{ fontSize: Math.max(6, size * 0.16), color: "#fff", background: "rgba(0,0,0,0.4)", lineHeight: 1.4 }}>
          {role}
        </span>
      )}
    </div>
  );
}

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

function EditPropertyModal({ property, currentUser, onClose, onSaved }) {
  const [form, setForm] = useState({
    title: property.title || "",
    area: property.area || "",
    emirate: property.emirate || "Dubai",
    price: property.price || "",
    beds: property.beds ?? "",
    baths: property.baths ?? "",
    sqft: property.sqft ?? "",
    furnished: property.furnished || "",
    serviceCharge: property.serviceCharge || "",
    description: property.description || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/properties", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: property.id.replace(/^db-/, ""),
          ownerId: currentUser?.id || null,
          title: form.title, area: form.area, emirate: form.emirate,
          price: Number(form.price) || 0,
          beds: form.beds !== "" ? Number(form.beds) : null,
          baths: form.baths !== "" ? Number(form.baths) : null,
          sqft: form.sqft !== "" ? Number(form.sqft) : null,
          furnished: form.furnished || null,
          serviceCharge: form.serviceCharge || null,
          description: form.description || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(data?.error || `Save failed (${res.status})`);
        setSaving(false);
        return;
      }
      onSaved({
        ...property,
        title: form.title, area: form.area, emirate: form.emirate,
        price: Number(form.price) || 0,
        beds: form.beds !== "" ? Number(form.beds) : null,
        baths: form.baths !== "" ? Number(form.baths) : null,
        sqft: form.sqft !== "" ? Number(form.sqft) : null,
        furnished: form.furnished || null,
        serviceCharge: form.serviceCharge || null,
        description: form.description || null,
      });
    } catch (e) {
      setError(`Couldn't reach the server — ${e.message}`);
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5 max-h-[85vh] overflow-y-auto" style={{ background: "#fff" }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk,sans-serif" }}>Edit listing</h2>
          <button onClick={onClose}><X size={18} /></button>
        </div>
        <div className="flex flex-col gap-2">
          <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Title"
            className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.area} onChange={(e) => update("area", e.target.value)} placeholder="Area"
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            <input value={form.price} onChange={(e) => update("price", e.target.value)} placeholder="Price (AED)"
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <input value={form.beds} onChange={(e) => update("beds", e.target.value)} placeholder="Beds" type="number"
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            <input value={form.baths} onChange={(e) => update("baths", e.target.value)} placeholder="Baths" type="number"
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            <input value={form.sqft} onChange={(e) => update("sqft", e.target.value)} placeholder="Sqft" type="number"
              className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
          </div>
          <select value={form.furnished} onChange={(e) => update("furnished", e.target.value)}
            className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
            <option value="">Furnishing</option>
            <option value="Furnished">Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
            <option value="Semi-furnished">Semi-furnished</option>
          </select>
          <textarea value={form.description} onChange={(e) => update("description", e.target.value)} rows={3}
            placeholder="Description" className="text-sm px-3 py-2 rounded-lg border outline-none resize-none" style={{ borderColor: T.line }} />
          {error && <div className="text-xs" style={{ color: "#E0554C" }}>{error}</div>}
          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-lg font-semibold text-sm mt-1"
            style={{ background: T.signal || "#00CFFF", color: "#04202A", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

function sharePost(title, id) {
  const url = `${typeof window !== "undefined" ? window.location.origin : "https://junction.technology"}/?listing=${id}`;
  if (navigator.share) {
    navigator.share({ title: `${title} — Junction`, url }).catch(() => {});
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(url).then(() => alert("Link copied to clipboard."));
  } else {
    alert(url);
  }
}

// ---------------------------------------------------------------
// INVENTORY — agencies/companies with many units (a whole building,
// a whole rent roll) upload a spreadsheet instead of posting one by
// one. Junction parses it, builds a structured inventory, and the
// owner chooses whether it ALSO becomes individual listings in Feed.
// ---------------------------------------------------------------

// Minimal, dependency-free CSV parser — handles quoted fields and commas
// inside quotes, which covers the vast majority of real agency exports.
function parseCsv(text) {
  const rows = [];
  let row = [], field = "", inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], next = text[i + 1];
    if (inQuotes) {
      if (c === '"' && next === '"') { field += '"'; i++; }
      else if (c === '"') inQuotes = false;
      else field += c;
    } else {
      if (c === '"') inQuotes = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n" || c === "\r") {
        if (field !== "" || row.length > 0) { row.push(field); rows.push(row); row = []; field = ""; }
        if (c === "\r" && next === "\n") i++;
      } else field += c;
    }
  }
  if (field !== "" || row.length > 0) { row.push(field); rows.push(row); }
  if (rows.length === 0) return { headers: [], data: [] };
  const headers = rows[0].map((h) => h.trim());
  const data = rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r) => {
    const obj = {};
    headers.forEach((h, i) => (obj[h] = (r[i] || "").trim()));
    return obj;
  });
  return { headers, data };
}

// Maps whatever column names a real agency actually used to our schema —
// covers common variants without forcing a rigid template on anyone.
const COLUMN_ALIASES = {
  unitNumber: ["unit number", "unit no", "unit no.", "unit", "unit #", "apt", "apartment"],
  unitType: ["unit type", "type", "layout", "bedroom type"],
  price: ["price", "rent", "rental price", "asking price", "price aed", "annual rent"],
  bedrooms: ["bedrooms", "beds", "br", "bed"],
  bathrooms: ["bathrooms", "baths", "ba", "bath"],
  sqft: ["sqft", "size", "area sqft", "size (sqft)", "sq ft"],
  floor: ["floor", "level"],
  status: ["status", "availability"],
  tenantName: ["tenant", "tenant name", "occupant", "resident"],
  leaseStart: ["lease start", "contract start", "start date", "move in", "move-in date"],
  leaseEnd: ["lease end", "contract end", "end date", "expiry", "expiry date", "renewal date"],
  lastRenewalType: ["renewal type", "renewed", "renewal status"],
};
function mapInventoryRow(raw) {
  const lower = {};
  Object.keys(raw).forEach((k) => (lower[k.trim().toLowerCase()] = raw[k]));
  const pick = (field) => {
    for (const alias of COLUMN_ALIASES[field]) if (lower[alias] != null && lower[alias] !== "") return lower[alias];
    return null;
  };
  const tenantName = pick("tenantName");
  const leaseEnd = normalizeDate(pick("leaseEnd"));
  return {
    unitNumber: pick("unitNumber"), unitType: pick("unitType"), price: pick("price"),
    bedrooms: pick("bedrooms"), bathrooms: pick("bathrooms"), sqft: pick("sqft"),
    floor: pick("floor"), status: pick("status") || "available",
    tenantName: tenantName || null,
    leaseStart: normalizeDate(pick("leaseStart")),
    leaseEnd,
    occupancyStatus: tenantName ? "occupied" : "vacant",
    lastRenewalType: pick("lastRenewalType") || null,
    raw,
  };
}
// Accepts DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD, or Excel-ish text dates and
// normalizes to YYYY-MM-DD (or null if unparseable) — real rent rolls are
// inconsistent about this, so we're lenient here rather than rejecting rows.
function normalizeDate(value) {
  if (!value) return null;
  const s = String(value).trim();
  if (!s) return null;
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`;
  const slash = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (slash) {
    let [, a, b, y] = slash;
    if (y.length === 2) y = `20${y}`;
    // Ambiguous DD/MM vs MM/DD — if the first part is > 12 it must be a day.
    const day = Number(a) > 12 ? a : b;
    const month = Number(a) > 12 ? b : a;
    return `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }
  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return null;
}
// How many days until this unit's lease ends (negative = already past).
function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr + "T00:00:00") - new Date(new Date().toDateString());
  return Math.round(diff / 86400000);
}

function InventoryUploadFlow({ currentUser, onClose, onCreated }) {
  const [step, setStep] = useState(0); // 0: upload, 1: preview + details
  const [fileName, setFileName] = useState("");
  const [parsedUnits, setParsedUnits] = useState([]);
  const [parseError, setParseError] = useState("");
  const [meta, setMeta] = useState({ name: "", inventoryType: "rent", area: "", emirate: "Dubai", breakdownMode: "inventory", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [aiSummary, setAiSummary] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const fileRef = useRef(null);

  // Deterministic lease intelligence — computed straight from the data,
  // no AI needed for this part: who's vacant now, who's about to be,
  // and how contracts have been trending (renewed vs turned over).
  const leaseStats = useMemo(() => {
    if (meta.inventoryType !== "rent" || !parsedUnits.length) return null;
    const withDates = parsedUnits.filter((u) => u.leaseEnd);
    const vacantNow = parsedUnits.filter((u) => u.occupancyStatus === "vacant").length;
    const next30 = withDates.filter((u) => { const d = daysUntil(u.leaseEnd); return d != null && d >= 0 && d <= 30; }).length;
    const next90 = withDates.filter((u) => { const d = daysUntil(u.leaseEnd); return d != null && d >= 0 && d <= 90; }).length;
    const overdue = withDates.filter((u) => { const d = daysUntil(u.leaseEnd); return d != null && d < 0; }).length;
    const renewedSame = parsedUnits.filter((u) => (u.lastRenewalType || "").toLowerCase().includes("renew")).length;
    return { vacantNow, next30, next90, overdue, renewedSame, withDatesCount: withDates.length };
  }, [parsedUnits, meta.inventoryType]);

  // "Let Junction organize this" — the AI writes a short, human presentation
  // of the uploaded rent roll / sale inventory instead of a raw table.
  const generateAiSummary = async () => {
    setAiLoading(true);
    try {
      const sample = parsedUnits.slice(0, 40).map((u) => ({
        unit: u.unitNumber, type: u.unitType, price: u.price, beds: u.bedrooms,
        occupancy: u.occupancyStatus, leaseEnd: u.leaseEnd, renewal: u.lastRenewalType,
      }));
      const reply = await callJunctionAI({
        system: "You are Junction's inventory analyst. Given raw parsed unit rows from a property manager's uploaded file, write a tight, professional 3-5 sentence presentation summary for a real estate app: what this building/portfolio is, unit mix, price range, and — if lease/occupancy data exists — vacancy and renewal outlook (how many units are vacant now, becoming vacant soon, or were renewed by the same tenant). No markdown, no headers, just prose a broker would read in 10 seconds.",
        messages: [{ role: "user", content: `Inventory name: ${meta.name || "Untitled"}\nType: ${meta.inventoryType}\nArea: ${meta.area}, ${meta.emirate}\nTotal units: ${parsedUnits.length}\nSample rows (JSON): ${JSON.stringify(sample)}` }],
        maxTokens: 350,
      });
      setAiSummary(reply || "");
    } catch (e) {
      setAiSummary("");
      setSubmitError(`Junction AI couldn't generate a summary (${e.message}) — you can still publish without it.`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleFile = (file) => {
    setFileName(file.name);
    setParseError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const { data } = parseCsv(String(e.target.result));
        if (data.length === 0) { setParseError("Couldn't find any rows — check the file has a header row plus at least one unit."); return; }
        setParsedUnits(data.map(mapInventoryRow));
        setStep(1);
      } catch (err) {
        setParseError(`Couldn't read that file — ${err.message}`);
      }
    };
    reader.readAsText(file);
  };

  const submit = async () => {
    if (!meta.name.trim()) { setSubmitError("Give this inventory a name (e.g. the building name)."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/properties?action=inventory", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...meta, units: parsedUnits, sourceFileName: fileName, parseNotes: aiSummary || null }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Couldn't publish this inventory."); return; }
      onCreated(data);
    } catch (e) {
      setSubmitError(`Couldn't reach the server — ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: "rgba(4,17,31,0.6)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col" style={{ background: "#fff", maxHeight: "92vh" }}>
        <div className="p-4 flex items-center justify-between shrink-0" style={{ background: "linear-gradient(135deg,#0E2A44,#163A5C)" }}>
          <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>
            <LayoutGrid size={15} /> List an inventory
          </div>
          <button onClick={onClose}><X size={18} color="#fff" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {step === 0 && (
            <>
              <p className="text-sm mb-1" style={{ color: T.ink }}>
                Have multiple units to list at once — a whole building, a whole rent roll? Upload your
                spreadsheet and Junction builds a structured, presentable inventory from it automatically.
              </p>
              <p className="text-xs mb-4" style={{ color: T.sub }}>
                Export your file as CSV first (Excel: File → Save As → CSV). Any column names work —
                Junction recognizes common variants like "Unit No", "Rent", "BR", "Size (sqft)", etc.
              </p>
              <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full text-sm font-bold py-8 rounded-xl border-2 border-dashed flex flex-col items-center gap-2"
                style={{ borderColor: T.line, color: T.sub }}>
                <Upload size={22} />
                {fileName || "Tap to choose a CSV file"}
              </button>
              {parseError && <p className="text-xs mt-2" style={{ color: "#E0554C" }}>{parseError}</p>}
            </>
          )}

          {step === 1 && (
            <>
              <div className="text-xs font-semibold mb-1.5" style={{ color: T.sub }}>
                Found {parsedUnits.length} unit{parsedUnits.length !== 1 ? "s" : ""} in {fileName}
              </div>
              <div className="rounded-xl border overflow-x-auto mb-4" style={{ borderColor: T.line, maxHeight: 160 }}>
                <table className="text-[11px] w-full">
                  <thead style={{ background: T.panel }}>
                    <tr>
                      {["Unit", "Type", "Price", "Beds", "Baths", "Sqft"].map((h) => (
                        <th key={h} className="text-left px-2 py-1.5 font-semibold" style={{ color: T.sub }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {parsedUnits.slice(0, 8).map((u, i) => (
                      <tr key={i} style={{ borderTop: `1px solid ${T.line}` }}>
                        <td className="px-2 py-1">{u.unitNumber || "—"}</td>
                        <td className="px-2 py-1">{u.unitType || "—"}</td>
                        <td className="px-2 py-1">{u.price || "—"}</td>
                        <td className="px-2 py-1">{u.bedrooms || "—"}</td>
                        <td className="px-2 py-1">{u.bathrooms || "—"}</td>
                        <td className="px-2 py-1">{u.sqft || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsedUnits.length > 8 && <div className="text-[10px] text-center py-1.5" style={{ color: T.sub }}>+ {parsedUnits.length - 8} more</div>}
              </div>

              {leaseStats && leaseStats.withDatesCount > 0 && (
                <div className="rounded-xl p-3 mb-3" style={{ background: "#0E2A4408", border: `1px solid ${T.line}` }}>
                  <div className="text-xs font-bold mb-1.5 flex items-center gap-1.5" style={{ color: T.ink }}>
                    <Sparkles size={12} style={{ color: T.signal }} /> Junction lease intelligence
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 text-[11px]" style={{ color: T.sub }}>
                    <div><b style={{ color: leaseStats.vacantNow ? "#E0554C" : T.ink }}>{leaseStats.vacantNow}</b> vacant right now</div>
                    <div><b style={{ color: leaseStats.next30 ? "#C9862B" : T.ink }}>{leaseStats.next30}</b> vacating in 30 days</div>
                    <div><b style={{ color: T.ink }}>{leaseStats.next90}</b> vacating in 90 days</div>
                    <div><b style={{ color: T.ink }}>{leaseStats.renewedSame}</b> renewed, same tenant</div>
                  </div>
                  {leaseStats.overdue > 0 && (
                    <div className="text-[11px] mt-1.5 font-semibold" style={{ color: "#E0554C" }}>
                      ⚠ {leaseStats.overdue} unit{leaseStats.overdue > 1 ? "s have" : " has"} a lease end date already in the past — worth double-checking.
                    </div>
                  )}
                </div>
              )}

              <div className="mb-3">
                {!aiSummary && (
                  <button onClick={generateAiSummary} disabled={aiLoading}
                    className="w-full text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                    style={{ background: T.panel, color: T.navy, opacity: aiLoading ? 0.6 : 1 }}>
                    <Sparkles size={13} /> {aiLoading ? "Junction is organizing this…" : "Let Junction write the presentation"}
                  </button>
                )}
                {aiSummary && (
                  <div className="rounded-xl p-3" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
                    <div className="text-[10px] font-bold mb-1" style={{ color: T.sub }}>JUNCTION'S PRESENTATION</div>
                    <p className="text-xs leading-relaxed" style={{ color: T.ink }}>{aiSummary}</p>
                    <button onClick={() => setAiSummary("")} className="text-[10px] font-semibold mt-1.5" style={{ color: T.sub }}>Rewrite</button>
                  </div>
                )}
              </div>

              <input value={meta.name} onChange={(e) => setMeta((m) => ({ ...m, name: e.target.value }))}
                placeholder="Inventory name (e.g. Marina Gate Tower — Rent Roll)"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={{ borderColor: T.line }} />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <select value={meta.inventoryType} onChange={(e) => setMeta((m) => ({ ...m, inventoryType: e.target.value }))}
                  className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                </select>
                <select value={meta.emirate} onChange={(e) => setMeta((m) => ({ ...m, emirate: e.target.value }))}
                  className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                  {["Dubai", "Abu Dhabi", "Sharjah", "Ajman", "Ras Al Khaimah", "Fujairah", "Umm Al Quwain"].map((e) => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <input value={meta.area} onChange={(e) => setMeta((m) => ({ ...m, area: e.target.value }))} placeholder="Area / community"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-3" style={{ borderColor: T.line }} />

              <div className="text-xs font-semibold mb-2" style={{ color: T.ink }}>How should this appear on Junction?</div>
              <div className="flex flex-col gap-2 mb-4">
                <button onClick={() => setMeta((m) => ({ ...m, breakdownMode: "inventory" }))}
                  className="text-left p-3 rounded-xl border" style={{ borderColor: meta.breakdownMode === "inventory" ? T.signal : T.line, background: meta.breakdownMode === "inventory" ? `${T.signal}12` : "#fff" }}>
                  <div className="text-xs font-bold" style={{ color: T.ink }}>One inventory page (recommended)</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.sub }}>Shows as a single browsable inventory in the Feed — cleaner for large unit counts.</div>
                </button>
                <button onClick={() => setMeta((m) => ({ ...m, breakdownMode: "per-unit" }))}
                  className="text-left p-3 rounded-xl border" style={{ borderColor: meta.breakdownMode === "per-unit" ? T.signal : T.line, background: meta.breakdownMode === "per-unit" ? `${T.signal}12` : "#fff" }}>
                  <div className="text-xs font-bold" style={{ color: T.ink }}>Also list each unit individually</div>
                  <div className="text-[11px] mt-0.5" style={{ color: T.sub }}>Every row also becomes its own listing in the main Feed, in addition to the inventory page.</div>
                </button>
              </div>

              {submitError && <p className="text-xs mb-2" style={{ color: "#E0554C" }}>{submitError}</p>}
              <button onClick={submit} disabled={submitting} className="w-full text-sm font-bold py-3 rounded-xl"
                style={{ background: "linear-gradient(135deg,#00CFFF,#0E2A44)", color: "#fff", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Publishing…" : `Publish inventory (${parsedUnits.length} units)`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function InventoryCard({ inv, onOpen }) {
  return (
    <button onClick={() => onOpen(inv.id)} className="text-left shrink-0 w-64 rounded-2xl overflow-hidden border mr-3"
      style={{ borderColor: T.line, background: "#fff" }}>
      <div className="h-20 flex items-center justify-between px-3.5" style={{ background: "linear-gradient(135deg,#0E2A44,#163A5C)" }}>
        <LayoutGrid size={18} color="#fff" style={{ opacity: 0.9 }} />
        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
          {inv.inventory_type === "sale" ? "FOR SALE" : "FOR RENT"} · INVENTORY
        </span>
      </div>
      <div className="p-3">
        <div className="text-sm font-bold truncate" style={{ color: T.ink }}>{inv.name}</div>
        <div className="text-xs mt-0.5" style={{ color: T.sub }}>{inv.area}{inv.emirate ? `, ${inv.emirate}` : ""}</div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] font-semibold" style={{ color: T.ink }}>{inv.unit_count} units</span>
          {inv.price_min && (
            <span className="text-[11px] font-semibold" style={{ color: T.signal }}>
              AED {Number(inv.price_min).toLocaleString()}{inv.price_max && inv.price_max !== inv.price_min ? `–${Number(inv.price_max).toLocaleString()}` : ""}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

function InventoryDetailView({ inventoryId, onClose, onChat }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid"); // "grid" | "list"

  useEffect(() => {
    setLoading(true);
    fetch(`/api/properties?action=inventory&id=${inventoryId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setData)
      .finally(() => setLoading(false));
  }, [inventoryId]);

  return (
    <div className="fixed inset-0 z-[70] overflow-y-auto" style={{ background: "#fff" }}>
      <div className="sticky top-0 z-10 p-4 flex items-center justify-between" style={{ background: "linear-gradient(135deg,#0E2A44,#163A5C)" }}>
        <button onClick={onClose}><ArrowLeft size={18} color="#fff" /></button>
        <div className="text-sm font-bold" style={{ color: "#fff" }}>{data?.inventory?.name || "Inventory"}</div>
        <div className="flex gap-1">
          <button onClick={() => setView("grid")} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: view === "grid" ? "rgba(255,255,255,0.2)" : "transparent" }}><LayoutGrid size={14} color="#fff" /></button>
          <button onClick={() => setView("list")} className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: view === "list" ? "rgba(255,255,255,0.2)" : "transparent" }}><BarChart3 size={14} color="#fff" /></button>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-sm" style={{ color: T.sub }}>Loading inventory…</div>
      ) : !data?.inventory ? (
        <div className="text-center py-16 text-sm" style={{ color: T.sub }}>Inventory not found.</div>
      ) : (
        <div className="p-4">
          <p className="text-sm mb-1" style={{ color: T.ink }}>{data.inventory.area}, {data.inventory.emirate}</p>
          {data.inventory.parse_notes && (
            <div className="rounded-xl p-3 my-3" style={{ background: "#0E2A4408", border: `1px solid ${T.line}` }}>
              <div className="text-[10px] font-bold mb-1 flex items-center gap-1" style={{ color: T.sub }}><Sparkles size={11} style={{ color: T.signal }} /> JUNCTION'S PRESENTATION</div>
              <p className="text-xs leading-relaxed" style={{ color: T.ink }}>{data.inventory.parse_notes}</p>
            </div>
          )}
          <div className="text-xs font-semibold mb-3" style={{ color: T.sub }}>{data.units.length} units</div>

          {data.inventory.inventory_type === "rent" && data.units.some((u) => u.lease_end || u.occupancy_status) && (
            <div className="rounded-xl p-3 mb-4" style={{ background: T.panel, border: `1px solid ${T.line}` }}>
              <div className="text-xs font-bold mb-2" style={{ color: T.ink }}>Occupancy & vacancy outlook</div>
              <div className="grid grid-cols-2 gap-2 text-[11px]" style={{ color: T.sub }}>
                <div><b style={{ color: "#E0554C" }}>{data.units.filter((u) => u.occupancy_status === "vacant").length}</b> vacant now</div>
                <div><b style={{ color: "#C9862B" }}>{data.units.filter((u) => { const d = daysUntil(u.lease_end); return d != null && d >= 0 && d <= 30; }).length}</b> vacating in 30 days</div>
                <div><b style={{ color: T.ink }}>{data.units.filter((u) => { const d = daysUntil(u.lease_end); return d != null && d > 30 && d <= 90; }).length}</b> vacating in 90 days</div>
                <div><b style={{ color: "#1F7A4D" }}>{data.units.filter((u) => (u.last_renewal_type || "").toLowerCase().includes("renew")).length}</b> renewed by same tenant</div>
              </div>
            </div>
          )}

          {view === "grid" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {data.units.map((u) => {
                const d = daysUntil(u.lease_end);
                return (
                <div key={u.id} className="rounded-xl border p-3" style={{ borderColor: T.line }}>
                  <div className="text-xs font-bold" style={{ color: T.ink }}>{u.unit_type || "Unit"} {u.unit_number ? `· ${u.unit_number}` : ""}</div>
                  <div className="text-[11px] mt-1" style={{ color: T.sub }}>
                    {u.bedrooms != null && `${u.bedrooms} bed · `}{u.bathrooms != null && `${u.bathrooms} bath · `}{u.sqft && `${u.sqft} sqft`}
                  </div>
                  {u.price && <div className="text-xs font-bold mt-1.5" style={{ color: T.signal }}>AED {Number(u.price).toLocaleString()}</div>}
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full mt-1.5 inline-block capitalize"
                    style={{ background: u.status === "available" ? "#E9F4EE" : T.panel, color: u.status === "available" ? "#1F7A4D" : T.sub }}>
                    {u.status}
                  </span>
                  {u.occupancy_status && (
                    <div className="mt-1.5 text-[10px]" style={{ color: T.sub }}>
                      {u.occupancy_status === "vacant" ? (
                        <span className="font-semibold" style={{ color: "#E0554C" }}>Vacant</span>
                      ) : (
                        <>
                          <span className="font-semibold" style={{ color: T.ink }}>{u.tenant_name || "Occupied"}</span>
                          {d != null && (
                            <span> · {d < 0 ? "lease ended" : `${d}d to lease end`}</span>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              );})}
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {data.units.map((u) => {
                const d = daysUntil(u.lease_end);
                return (
                <div key={u.id} className="flex items-center justify-between p-2.5 rounded-lg" style={{ background: T.panel }}>
                  <span className="text-xs font-semibold" style={{ color: T.ink }}>{u.unit_number || "—"} · {u.unit_type || "Unit"}</span>
                  <span className="text-[11px]" style={{ color: T.sub }}>{u.bedrooms}bed/{u.bathrooms}bath · {u.sqft}sqft</span>
                  {u.occupancy_status === "vacant" ? (
                    <span className="text-[10px] font-bold" style={{ color: "#E0554C" }}>Vacant</span>
                  ) : d != null ? (
                    <span className="text-[10px] font-bold" style={{ color: d <= 30 ? "#C9862B" : T.sub }}>{d < 0 ? "Ended" : `${d}d left`}</span>
                  ) : null}
                  {u.price && <span className="text-xs font-bold" style={{ color: T.signal }}>AED {Number(u.price).toLocaleString()}</span>}
                </div>
              );})}
            </div>
          )}

          <button onClick={onChat} className="w-full mt-5 text-sm font-bold py-3 rounded-xl" style={{ background: T.ink, color: "#fff" }}>
            Message about this inventory
          </button>
        </div>
      )}
    </div>
  );
}

function PropertyCard({ p, liveViews }) {
  const isInvestor = p.visibility === "investor";
  const views = liveViews[p.id] ?? p.views;
  return (
    <div
      className="rounded-xl overflow-hidden border flex flex-col relative"
      style={{ borderColor: T.line, background: "#fff" }}
    >
      {!p.isLive && (
        <span className="absolute top-2 right-2 z-10 text-[9px] font-bold px-1.5 py-0.5 rounded"
          style={{ background: "rgba(0,0,0,0.55)", color: "#fff", letterSpacing: ".5px" }}>
          DEMO
        </span>
      )}
      <button onClick={(e) => { e.stopPropagation(); sharePost(p.title, p.id); }}
        className="absolute top-2 z-10 p-1.5 rounded-full"
        style={{ right: p.isLive ? "8px" : "56px", background: "rgba(0,0,0,0.5)" }}
        title="Share">
        <Share2 size={13} color="#fff" />
      </button>
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
          {p.sqft != null && (
            <span className="flex items-center gap-1"><Maximize size={13} /> {p.sqft.toLocaleString()} sqft</span>
          )}
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
        {/* Junction Score Ring */}
        {typeof p.sustainabilityScore === "number" && (
          <div className="mt-2 pt-2 border-t flex items-center gap-3" style={{ borderColor:T.line }}>
            <div className="relative flex items-center justify-center shrink-0" style={{width:40,height:40}}>
              <svg width="40" height="40" viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="16" fill="none" stroke={T.line} strokeWidth="3.5"/>
                <circle cx="20" cy="20" r="16" fill="none"
                  stroke={p.sustainabilityScore>=70?"#1F7A4D":p.sustainabilityScore>=40?"#C9A227":"#CE1126"}
                  strokeWidth="3.5" strokeLinecap="round"
                  strokeDasharray={`${p.sustainabilityScore} 100`}
                  transform="rotate(-90 20 20)"/>
              </svg>
              <span className="absolute text-[9px] font-bold" style={{color:T.ink}}>{p.sustainabilityScore}</span>
            </div>
            <div>
              <div className="text-[11px] font-semibold" style={{color:T.ink}}>Junction Score</div>
              <div className="text-[10px]" style={{color:T.sub}}>{p.sustainabilityScore>=70?"Quality verified":p.sustainabilityScore>=40?"Standard":"Limited data"}</div>
            </div>
          </div>
        )}
        {p.ghostRisk > 0.55 && (
          <div className="mt-2 px-2 py-1.5 rounded-lg flex items-center gap-1.5 text-[11px]"
            style={{background:"#FFF3CD",color:"#856404",animation:"ghostFlicker 2s ease-in-out infinite"}}>
            <AlertTriangle size={11}/> Ghost Risk — listing may no longer be available
          </div>
        )}
        {p.listingChain?.length > 0 && (
          <div className="mt-2 pt-2 border-t" style={{ borderColor: T.line }}>
            <div className="flex items-center gap-1 text-[11px] font-semibold mb-2" style={{ color: T.sub }}>
              <Activity size={11} /> Verified listing history
            </div>
            <div className="flex flex-col gap-1.5">
              {p.listingChain.map((step, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="flex flex-col items-center mt-1">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: i === p.listingChain.length - 1 ? T.navy : T.line, border:`1.5px solid ${T.navy}` }}/>
                    {i < p.listingChain.length - 1 && <div className="w-0.5 h-3 mt-0.5" style={{ background: T.line }}/>}
                  </div>
                  <div className="text-[11px] leading-tight" style={{ color: T.sub }}>
                    <span style={{ color: T.ink, fontWeight: 600 }}>
                      {step.price != null ? `AED ${step.price.toLocaleString()}` : step.name}
                    </span>
                    {step.listedBy ? <>{" · "}{step.listedBy}</> : null}
                    {" · "}<span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>{step.date}</span>
                  </div>
                </div>
              ))}
            </div>
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
        boxShadow: expanded
          ? `0 10px 24px rgba(0,0,0,0.18), 0 0 0 3px ${T.brass}`
          : p.propertyAura==="cyan" ? "0 0 18px rgba(0,207,255,.6), 0 8px 16px rgba(0,0,0,.12)"
          : p.propertyAura==="gold" ? "0 0 18px rgba(201,162,39,.6), 0 8px 16px rgba(0,0,0,.12)"
          : p.propertyAura==="coral" ? "0 0 18px rgba(255,90,54,.6), 0 8px 16px rgba(0,0,0,.12)"
          : p.propertyAura==="green" ? "0 0 18px rgba(31,122,77,.6), 0 8px 16px rgba(0,0,0,.12)"
          : "0 8px 16px rgba(0,0,0,0.12)",
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
      {p.propertyAura === "green" && (
        <span className="absolute top-1 right-1.5">
          <Leaf size={12} color="#fff" style={{ filter:"drop-shadow(0 0 3px #1F7A4D)" }}/>
        </span>
      )}
      {p.ghostRisk > 0.55 && (
        <span className="absolute top-1 left-1.5" style={{ animation:"ghostFlicker 2s ease-in-out infinite" }}>
          <AlertTriangle size={12} color="#C9A227"/>
        </span>
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

function FeedView({ liveViews, properties, currentUser, onPropertyUpdated }) {
  const [editingProperty, setEditingProperty] = useState(null);
  const [activeOrb, setActiveOrb] = useState("forYou");
  const [paused, setPaused] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [inventories, setInventories] = useState([]);
  const [showInventoryUpload, setShowInventoryUpload] = useState(false);
  const [openInventoryId, setOpenInventoryId] = useState(null);

  useEffect(() => {
    fetch("/api/properties?action=inventory")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setInventories(data?.inventories || []))
      .catch(() => {});
  }, []);

  const orb = DISCOVERY_ORBS.find((o) => o.id === activeOrb) || DISCOVERY_ORBS[0];

  const handleSelect = (id) => {
    setActiveOrb((prev) => {
      if (prev === id) {
        setPaused(false);
        return "forYou";
      }
      setPaused(true);
      return id;
    });
    setExpandedId(null);
  };

  const resumeRolling = () => {
    setActiveOrb("forYou");
    setPaused(false);
    setExpandedId(null);
  };

  // AI Matching Engine — scores each property against implicit signals:
  // trending velocity, view counts, sustainability score, recent activity,
  // and how "complete" the listing is (chain, photos, verified lister).
  // In production this would be a real ML model trained on user behaviour.
  const aiScore = (p) => {
    let score = 0;
    if (p.trending) score += 30;
    if (p.promoted) score += 20;
    score += Math.min(p.views / 100, 25);
    if (p.sustainabilityScore) score += p.sustainabilityScore * 0.15;
    if (p.listingChain?.length > 1) score += 10;
    if (p.listedAs === "LICENSED_BROKER") score += 8;
    if (p.listedAs === "DEVELOPER") score += 6;
    if (p.status === "active") score += 5;
    return score;
  };

  const list = useMemo(() => {
    let base = properties.filter((p) => p.visibility !== "investor");
    if (activeOrb === "aiMatch") {
      return [...base].sort((a, b) => (!!b.isLive - !!a.isLive) || (aiScore(b) - aiScore(a)));
    }
    if (orb.filter) base = base.filter(orb.filter);
    if (activeOrb === "forYou") {
      base = [...base].sort((a, b) =>
        (!!b.isLive - !!a.isLive) ||
        (b.trending - a.trending) || (b.promoted - a.promoted) || (b.views - a.views)
      );
    } else {
      // Even inside a specific category orb, real posts still lead.
      base = [...base].sort((a, b) => !!b.isLive - !!a.isLive);
    }
    return base;
  }, [activeOrb, properties, orb]);

  return (
    <div className="p-4 md:p-6">
      <div className="mb-3">
        <div className="flex items-center justify-between gap-2 mb-1">
          <h1 style={{fontFamily:"'Space Grotesk',sans-serif",color:T.ink}} className="text-2xl font-semibold">
            Junction
          </h1>
          <div className="flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{background:"#00CFFF12",color:"#1A5A7A",border:"1px solid #00CFFF22"}}>
            <Globe2 size={10}/> Visible worldwide · No login required
          </div>
        </div>
        <p className="text-sm" style={{color:T.sub}}>
          Every listing is open to visitors from any country. Register to become a Junction citizen.
        </p>
      </div>

      <DiscoveryOrbs activeOrb={activeOrb} onSelect={handleSelect} paused={paused} />

      {activeOrb === "forYou" && inventories.length > 0 && (
        <div className="mt-3 mb-1">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-bold flex items-center gap-1.5" style={{ color: T.ink }}>
              <LayoutGrid size={12} /> Inventory — multi-unit listings
            </div>
            {currentUser && (
              <button onClick={() => setShowInventoryUpload(true)} className="text-[10px] font-semibold" style={{ color: T.signal }}>+ List inventory</button>
            )}
          </div>
          <div className="flex overflow-x-auto pb-1 -mx-1 px-1">
            {inventories.map((inv) => <InventoryCard key={inv.id} inv={inv} onOpen={setOpenInventoryId} />)}
          </div>
        </div>
      )}
      {activeOrb === "forYou" && inventories.length === 0 && currentUser && (
        <button onClick={() => setShowInventoryUpload(true)}
          className="mt-3 mb-1 w-full text-xs font-semibold px-3 py-2.5 rounded-xl flex items-center justify-center gap-1.5"
          style={{ background: T.panel, color: T.sub, border: `1px dashed ${T.line}` }}>
          <Upload size={12} /> Have multiple units to list? Upload an inventory
        </button>
      )}

      {showInventoryUpload && (
        <InventoryUploadFlow
          currentUser={currentUser}
          onClose={() => setShowInventoryUpload(false)}
          onCreated={(data) => {
            setShowInventoryUpload(false);
            fetch("/api/properties?action=inventory").then((r) => r.json()).then((d) => setInventories(d?.inventories || []));
            alert(`Inventory published — ${data.unitsCreated} units added${data.listingsCreated ? `, ${data.listingsCreated} also listed individually` : ""}.`);
          }}
        />
      )}
      {openInventoryId && (
        <InventoryDetailView inventoryId={openInventoryId} onClose={() => setOpenInventoryId(null)} onChat={() => setOpenInventoryId(null)} />
      )}

      {activeOrb === "forYou" && <AdBanner />}

      {/* AI Match banner */}
      {activeOrb === "aiMatch" && (
        <div className="mt-2 mb-1 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: "linear-gradient(135deg,#006EFF18,#00CFFF10)", border:"1px solid #00CFFF33" }}>
          <Sparkles size={16} style={{ color:"#00CFFF", shrink:0 }}/>
          <p className="text-xs" style={{ color:"#1A5A7A" }}>
            Junction AI ranked these listings based on demand velocity, verification quality,
            sustainability score and recent activity — no manual search needed.
          </p>
        </div>
      )}

      {/* Property History banner */}
      {activeOrb === "history" && (
        <div className="mt-2 mb-1 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: "#1F7A4D12", border:"1px solid #1F7A4D33" }}>
          <Activity size={16} style={{ color:"#1F7A4D", shrink:0 }}/>
          <p className="text-xs" style={{ color:"#1F7A4D" }}>
            Every listing below has a verified transaction chain — you can see who listed it,
            when, and at what price. Property history builds trust that no competitor can fake.
          </p>
        </div>
      )}

      {activeOrb === "ghost" && (
        <div className="mt-2 mb-1 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{background:"#C9A22712",border:"1px solid #C9A22733"}}>
          <AlertTriangle size={16} style={{color:"#C9A227",flexShrink:0}}/>
          <p className="text-xs" style={{color:"#856404"}}>
            Junction AI flags these listings as potentially unavailable based on price-freeze duration,
            agent inactivity, and absence of verified viewings.
          </p>
        </div>
      )}
      {/* Pre-Launch banner */}
      {activeOrb === "prelaunch" && (
        <div className="mt-2 mb-1 px-3 py-2.5 rounded-xl flex items-center gap-2.5"
          style={{ background: "#7C3FA012", border:"1px solid #7C3FA033" }}>
          <Crown size={16} style={{ color:"#7C3FA0", shrink:0 }}/>
          <p className="text-xs" style={{ color:"#5A2A80" }}>
            These listings come directly from UAE developers before public launch.
            Junction is the exclusive channel — not available on any other platform yet.
          </p>
        </div>
      )}

      <div key={activeOrb} className="tab-fade mt-3 mb-3 flex items-center justify-between gap-2">
        <div>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold">
            {orb.headline}
          </div>
          <p className="text-xs mt-0.5" style={{ color: T.sub }}>{orb.sub}</p>
        </div>
        {activeOrb !== "forYou" && (
          <button
            onClick={resumeRolling}
            className="text-[11px] font-semibold px-3 py-1.5 rounded-full whitespace-nowrap shrink-0"
            style={{ background: T.navy, color: "#fff" }}
          >
            ← Resume
          </button>
        )}
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
              {currentUser && list.find((p) => p.id === expandedId)?.ownerId === currentUser.id && (
                <button onClick={() => setEditingProperty(list.find((p) => p.id === expandedId))}
                  className="w-full mt-2 text-sm font-semibold py-2.5 rounded-lg"
                  style={{ background: T.ink, color: "#fff" }}>
                  Edit your listing
                </button>
              )}
            </div>
          )}
          {editingProperty && (
            <EditPropertyModal
              property={editingProperty}
              currentUser={currentUser}
              onClose={() => setEditingProperty(null)}
              onSaved={(updated) => { onPropertyUpdated(updated); setEditingProperty(null); }}
            />
          )}
        </div>
      )}

      {/* Phase 3 features — teaser cards at the bottom of the feed */}
      {activeOrb === "forYou" && (
        <div className="mt-6 flex flex-col gap-3">
          <div className="text-xs font-semibold uppercase tracking-wide mb-1" style={{ color: T.sub }}>
            Coming to Junction
          </div>
          {[
            {
              icon: FileCheck2,
              title: "Smart Tenancy Contracts",
              sub: "On-platform tenancy agreements integrated with Ejari — sign, store and renew without leaving Junction.",
              color: "#1F3D5C",
              bg: "#1F3D5C10",
            },
            {
              icon: CreditCard,
              title: "Embedded Finance",
              sub: "Rent advances for landlords, flexible payment for tenants. Junction becomes the financial layer of UAE real estate.",
              color: "#1F7A4D",
              bg: "#1F7A4D10",
            },
          ].map((f) => (
            <div key={f.title} className="rounded-xl p-4 border flex items-start gap-3"
              style={{ background: f.bg, borderColor: f.color + "33" }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: f.color + "18" }}>
                <f.icon size={16} style={{ color: f.color }}/>
              </div>
              <div>
                <div className="text-sm font-semibold flex items-center gap-2"
                  style={{ color: T.ink }}>
                  {f.title}
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                    style={{ background: f.color + "22", color: f.color }}>
                    Soon
                  </span>
                </div>
                <p className="text-xs mt-0.5" style={{ color: T.sub }}>{f.sub}</p>
              </div>
            </div>
          ))}
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

function InvestorZone({ liveViews, properties, currentUser, onUpgrade }) {
  const investorListings = properties.filter((p) => p.visibility === "investor");
  const unlocked = hasAccess(currentUser, "investorZone");

  if (!unlocked) {
    const tier = PASSPORT_TIERS.investor;
    return (
      <div className="p-4 md:p-6 flex flex-col items-center justify-center text-center" style={{ minHeight: "70vh" }}>
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center mb-4"
          style={{ background: T.ink }}
        >
          <Lock size={22} color={T.paper} />
        </div>
        <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-xl font-semibold mb-2">
          The Investor Zone needs an Investor Passport
        </h2>
        <p className="text-sm max-w-md mb-6" style={{ color: T.sub }}>
          Off-market deals, bulk packages, and pre-launch developer projects are only visible on the
          {" "}{tier.name} ({tier.price}{tier.priceNote}). Upgrade from your Passport — it also unlocks
          view analytics and the AI event concierge.
        </p>
        <button
          onClick={onUpgrade}
          className="text-sm font-semibold px-5 py-2.5 rounded-lg flex items-center gap-2"
          style={{ background: T.ink, color: T.paper }}
        >
          <ShieldCheck size={16} /> Upgrade to {tier.name}
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
          {p.sqft != null && <span className="flex items-center gap-1"><Maximize size={14} /> {p.sqft.toLocaleString()} sqft</span>}
        </div>
      </div>
    </div>
  );
}

function ServiceReelCard({ s, liked, onLike, onChat, onCall, isFirst }) {
  return (
    <div
      className="relative w-full h-full flex flex-col justify-end overflow-hidden"
      style={{ background: `linear-gradient(160deg, ${s.grad[0]}, ${s.grad[1]} 75%)` }}
    >
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(circle at 75% 20%, rgba(255,255,255,0.10), transparent 45%), radial-gradient(circle at 15% 85%, rgba(0,0,0,0.25), transparent 50%)",
        }}
      />
      <div className="absolute rounded-full" style={{ width: "70px", height: "70px", background: "rgba(255,255,255,0.08)", top: "18%", left: "8%", animation: "balloonDrift 7s ease-in-out infinite" }} />
      <div className="absolute rounded-full" style={{ width: "110px", height: "110px", background: "rgba(255,255,255,0.05)", top: "50%", right: "-20px", animation: "balloonDrift 9s ease-in-out 1.2s infinite" }} />

      <div className="absolute top-4 left-4 flex gap-1.5 z-10">
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: "rgba(0,0,0,0.4)", color: "#fff" }}>
          <Wrench size={11} /> Service
        </span>
        {s.pending && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full" style={{ background: T.brass, color: T.ink }}>
            New
          </span>
        )}
      </div>
      <div className="absolute top-4 right-4 z-10">
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1" style={{ background: s.online ? "#1F7A4D" : "rgba(0,0,0,0.35)", color: "#fff" }}>
          <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: "#fff" }} />
          {s.online ? "Available now" : "Offline"}
        </span>
      </div>

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
        <button onClick={() => onChat?.(s)} className="flex flex-col items-center gap-1">
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
      </div>

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
          {s.rate}
        </div>
        <div className="text-base font-semibold text-white mt-1">{s.name}</div>
        <div className="flex items-center gap-1 text-sm mt-1" style={{ color: "rgba(255,255,255,0.85)" }}>
          <Wrench size={13} /> {s.category}
        </div>
        <div className="flex items-center gap-3 text-sm mt-2" style={{ color: "rgba(255,255,255,0.85)" }}>
          <span className="flex items-center gap-1"><MapPin size={14} /> {s.area}, {s.emirate}</span>
          {s.rating > 0 && (
            <span className="flex items-center gap-1"><Star size={14} fill="#fff" stroke="none" /> {s.rating}</span>
          )}
        </div>
      </div>
    </div>
  );
}

function ReelsView({ properties, liveViews, onChat }) {
  const [liked, setLiked] = useState({});
  const [activeCall, setActiveCall] = useState(null);

  // Reels is real-estate only now — services and jobs live in their own
  // tabs (Services, Junction Work), not mixed into this feed. Newest real
  // listings surface first, same logic as the main Feed.
  const merged = properties
    .filter((p) => p.visibility !== "investor")
    .map((p) => ({ kind: "property", data: p, isNew: !!p.isNew || !!p.isLive }))
    .sort((a, b) => {
      if (a.isNew !== b.isNew) return a.isNew ? -1 : 1;
      return 0;
    });

  return (
    <div
      className="overflow-y-scroll h-full"
      style={{ scrollSnapType: "y mandatory", background: T.ink }}
    >
      {merged.length === 0 && (
        <div className="h-full flex items-center justify-center text-sm px-6 text-center" style={{ color: T.paper }}>
          No reels yet — post a property or a service to see it here.
        </div>
      )}
      {merged.map((item, idx) => (
        <div key={`${item.kind}-${item.data.id}`} className="h-full" style={{ scrollSnapAlign: "start" }}>
          {item.kind === "property" ? (
            <ReelCard
              p={item.data}
              views={liveViews[item.data.id] ?? item.data.views}
              liked={!!liked[item.data.id]}
              isFirst={idx === 0}
              onLike={() => setLiked((prev) => ({ ...prev, [item.data.id]: !prev[item.data.id] }))}
              onChat={onChat}
              onCall={() =>
                setActiveCall({ mode: "video", contact: { name: `Agent · ${item.data.area}`, online: true } })
              }
            />
          ) : item.kind === "service" ? (
            <ServiceReelCard
              s={item.data}
              liked={!!liked[item.data.id]}
              isFirst={idx === 0}
              onLike={() => setLiked((prev) => ({ ...prev, [item.data.id]: !prev[item.data.id] }))}
              onChat={onChat}
              onCall={() =>
                setActiveCall({ mode: "voice", contact: { name: item.data.name, online: item.data.online } })
              }
            />
          ) : (
            <JobReelCard
              item={item.data}
              isFirst={idx === 0}
              onApply={() => {}}
              onContact={onChat}
            />
          )}
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
  const [reach, setReach] = useState("local");
  const emiratesIdOk = (statuses.EMIRATES_ID || "none") === "verified";
  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center" style={{ background: "rgba(20,25,31,0.5)" }}>
      <div
        className="w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl flex flex-col"
        style={{ background: "#fff", height: "min(85vh, 600px)", minHeight: 0 }}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: T.line, background: "#fff" }}>
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
          <>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto" style={{ flex: "1 1 auto", minHeight: 0 }}>
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

            <div className="text-left">
              <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Who should this reach?</div>
              <div className="flex flex-col gap-2">
                {REACH_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReach(r.id)}
                    className="text-left p-2.5 rounded-lg border flex items-center justify-between"
                    style={{
                      borderColor: reach === r.id ? T.navy : T.line,
                      background: reach === r.id ? T.paper : "#fff",
                    }}
                  >
                    <div>
                      <div className="text-xs font-medium" style={{ color: T.ink }}>{r.label}</div>
                      <div className="text-[10px]" style={{ color: T.sub }}>{r.sub}</div>
                    </div>
                    {reach === r.id && <CheckCircle2 size={14} style={{ color: T.navy }} />}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="text-[11px] px-3 py-2 rounded-lg flex items-start gap-2"
              style={{ background: "#FDF3E2", color: "#9A6B17" }}
            >
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              Your listing will show as "Pending review" until our team confirms it's a genuine
              real-estate-related service before it goes live.
            </div>
          </div>
          <div className="p-4 border-t shrink-0" style={{ borderColor: T.line, background: "#fff" }}>
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
                  reach,
                  grad: ["#2C5278", "#14191F"],
                });
              }}
              className="w-full text-sm font-semibold px-4 py-3 rounded-lg"
              style={{ background: T.ink, color: T.paper }}
            >
              Submit for review
            </button>
          </div>
          </>
        )}
      </div>
    </div>
  );
}

function ServicesView({ providers, statuses, onChat, onPublishService }) {
  const [filter, setFilter] = useState("All");
  const [showPost, setShowPost] = useState(false);
  const [activeCall, setActiveCall] = useState(null);
  const list = providers;

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
            onPublishService(s);
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

// ---------------------------------------------------------------
// CONNECT — real user-to-user messaging. Replaces the old mock threads
// where "replies" were secretly Junction AI role-playing as a person.
// The one AI thread that remains (pinned at top) is honestly labeled
// as Junction AI, never impersonating a human.
// ---------------------------------------------------------------
const JUNCTION_AI_THREAD_ID = "junction-ai";

function useOutbox() {
  const [outbox, setOutbox] = useState(() => {
    try { return JSON.parse(localStorage.getItem("junction_outbox") || "[]"); } catch { return []; }
  });
  useEffect(() => {
    try { localStorage.setItem("junction_outbox", JSON.stringify(outbox)); } catch {}
  }, [outbox]);
  return [outbox, setOutbox];
}

function MessagesView({ currentUser, onSignIn }) {
  const [threads, setThreads] = useState([]);
  const [activeId, setActiveId] = useState(JUNCTION_AI_THREAD_ID);
  const [aiMessages, setAiMessages] = useState([{ from: "them", text: "Hi! I'm Junction AI — ask me anything about listings, areas, or how the app works." }]);
  const [threadMessages, setThreadMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [mobileView, setMobileView] = useState("list");
  const [activeCall, setActiveCall] = useState(null);
  const [presence, setPresence] = useState({});
  const [myStatus, setMyStatus] = useState("online"); // "online" | "busy" | "offline"
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [outbox, setOutbox] = useOutbox();
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNewChat, setShowNewChat] = useState(false);
  const [newChatEmail, setNewChatEmail] = useState("");
  const [newChatError, setNewChatError] = useState("");
  const [directory, setDirectory] = useState([]);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryLoading, setDirectoryLoading] = useState(false);

  useEffect(() => {
    if (!showNewChat || !currentUser?.id) return;
    setDirectoryLoading(true);
    const t = setTimeout(() => {
      fetch(`/api/conversations?action=directory&q=${encodeURIComponent(directoryQuery.trim())}`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => setDirectory(data?.users || []))
        .catch(() => {})
        .finally(() => setDirectoryLoading(false));
    }, 200);
    return () => clearTimeout(t);
  }, [showNewChat, directoryQuery, currentUser?.id]);
  const fileInputRef = useRef(null);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const scrollRef = useRef(null);

  const isAiThread = activeId === JUNCTION_AI_THREAD_ID;
  const activeThread = threads.find((t) => t.id === activeId);
  const otherUserId = activeThread
    ? (activeThread.participant_ids || []).find((uid) => String(uid) !== String(currentUser?.id)) || null
    : null;

  // Load real conversations for the signed-in user.
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/conversations?userId=${currentUser.id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setThreads(data?.conversations || []))
      .catch(() => {});
  }, [currentUser?.id]);

  // Load messages for the active human conversation, poll while it's open.
  useEffect(() => {
    if (isAiThread || !activeId) return;
    let cancelled = false;
    const load = () => {
      fetch(`/api/conversations/${activeId}/messages`, { credentials: "include" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => { if (!cancelled) setThreadMessages(data?.messages || []); })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 4000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [activeId, isAiThread]);

  // Presence: heartbeat my own status, poll everyone else's.
  useEffect(() => {
    if (!currentUser?.id) return;
    const beat = () => fetch("/api/conversations?action=presence", {
      method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: currentUser.id, status: isOnline ? myStatus : "offline" }),
    }).catch(() => {});
    beat();
    const interval = setInterval(beat, 25000);
    return () => clearInterval(interval);
  }, [currentUser?.id, myStatus, isOnline]);

  useEffect(() => {
    const ids = threads.map((t) => (t.participant_ids || []).find((uid) => String(uid) !== String(currentUser?.id))).filter(Boolean);
    if (ids.length === 0) return;
    const poll = () => fetch(`/api/conversations?action=presence&userIds=${ids.join(",")}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setPresence(data.presence || {}))
      .catch(() => {});
    poll();
    const interval = setInterval(poll, 15000);
    return () => clearInterval(interval);
  }, [threads, currentUser?.id]);

  // Offline detection + auto-flush queued messages on reconnect.
  useEffect(() => {
    const goOnline = () => { setIsOnline(true); flushOutbox(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => { window.removeEventListener("online", goOnline); window.removeEventListener("offline", goOffline); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outbox]);

  const flushOutbox = async () => {
    if (outbox.length === 0) return;
    const remaining = [];
    for (const item of outbox) {
      try {
        const res = await fetch(`/api/conversations/${item.conversationId}/messages`, {
          method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(item.payload),
        });
        if (!res.ok) remaining.push(item);
      } catch { remaining.push(item); }
    }
    setOutbox(remaining);
  };

  useEffect(() => { scrollRef.current?.scrollTo?.(0, scrollRef.current.scrollHeight); }, [threadMessages, aiMessages]);

  const sendToAi = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    const userMsg = { from: "me", text };
    setDraft("");
    setAiMessages((p) => [...p, userMsg]);
    setSending(true);
    try {
      const reply = await callJunctionAI({
        system: "You are Junction AI, a helpful assistant inside the Junction super-app for UAE real estate, jobs, and services. Be concise and genuinely useful. Never pretend to be a human.",
        messages: [...aiMessages, userMsg].map((m) => ({ role: m.from === "me" ? "user" : "assistant", content: m.text })),
        maxTokens: 400,
      });
      setAiMessages((p) => [...p, { from: "them", text: reply }]);
    } catch (e) {
      setAiMessages((p) => [...p, { from: "system", text: `Couldn't reach Junction AI — ${e.message}` }]);
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async ({ type = "text", text, mediaUrl, mediaMeta } = {}) => {
    if (isAiThread) return sendToAi();
    if (!currentUser?.id || !otherUserId) return;
    const payload = { senderId: currentUser.id, type, body: text ?? undefined, mediaUrl, mediaMeta };

    // Optimistic local render.
    const optimistic = { id: `local-${Date.now()}`, sender_id: currentUser.id, type, body: text, media_url: mediaUrl, media_meta: mediaMeta, created_at: new Date().toISOString() };
    setThreadMessages((p) => [...p, optimistic]);

    if (!isOnline) {
      setOutbox((p) => [...p, { conversationId: activeId, payload, queuedAt: Date.now() }]);
      return;
    }
    try {
      const res = await fetch(`/api/conversations/${activeId}/messages`, { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      if (!res.ok) setOutbox((p) => [...p, { conversationId: activeId, payload, queuedAt: Date.now() }]);
    } catch {
      setOutbox((p) => [...p, { conversationId: activeId, payload, queuedAt: Date.now() }]);
    }
  };

  const send = () => {
    const text = draft.trim();
    if (!text) return;
    setDraft("");
    sendMessage({ type: "text", text });
  };

  const uploadAndSend = async (file, kind) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "chat");
    try {
      const res = await fetch("/api/people?action=upload", { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      sendMessage({ type: kind, mediaUrl: data.url, mediaMeta: { name: data.name, size: data.size, contentType: data.contentType } });
    } catch (e) {
      setThreadMessages((p) => [...p, { id: `err-${Date.now()}`, sender_id: "system", type: "text", body: `Attachment failed to send — ${e.message}`, created_at: new Date().toISOString() }]);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks = [];
      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        uploadAndSend(new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" }), "voice");
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      alert("Couldn't access your microphone — check browser permissions.");
    }
  };
  const stopRecording = () => { mediaRecorderRef.current?.stop(); setRecording(false); };

  const startChatWith = async (otherUser) => {
    setNewChatError("");
    try {
      const created = await fetch("/api/conversations", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ participantIds: [currentUser.id, otherUser.id] }),
      }).then((r) => r.json());
      const conversationId = created.conversation.id;
      await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ senderId: currentUser.id, body: `Hi ${otherUser.name}! 👋` }),
      });
      setThreads((p) => [{ id: conversationId, participant_ids: [currentUser.id, otherUser.id], context_label: null, last_body: `Hi ${otherUser.name}! 👋` }, ...p]);
      setActiveId(conversationId);
      setShowNewChat(false);
      setDirectoryQuery("");
      setMobileView("chat");
    } catch (e) {
      setNewChatError(`Couldn't start the conversation — ${e.message}`);
    }
  };
  // Kept for any other callers; the UI now uses the directory instead of email lookup.
  const startNewChat = () => {};

  if (!currentUser) {
    return (
      <div className="p-6 flex flex-col items-center text-center" style={{ minHeight: "70vh" }}>
        <MessageCircle size={26} style={{ color: T.sub }} className="mb-4" />
        <h2 className="text-lg font-bold mb-1" style={{ color: T.ink, fontFamily: "'Space Grotesk',sans-serif" }}>Sign in to use Connect</h2>
        <p className="text-sm mb-5 max-w-xs" style={{ color: T.sub }}>Real conversations with real people on Junction — sign in to start.</p>
        <button onClick={onSignIn} className="px-6 py-2.5 rounded-xl font-semibold text-sm" style={{ background: T.signal, color: "#04202A" }}>Sign In</button>
      </div>
    );
  }

  const presenceDot = (status) => ({ online: "#1F7A4D", busy: "#C9A227", offline: T.line }[status] || T.line);
  const activeMessages = isAiThread ? aiMessages : threadMessages;

  return (
    <div className="flex h-full" style={{ minHeight: "70vh" }}>
      <div className={`${mobileView === "chat" ? "hidden" : "flex"} sm:flex w-full sm:w-72 border-r flex-col`} style={{ borderColor: T.line }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: T.line }}>
          <div>
            <h2 style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-lg font-semibold">Connect</h2>
            <div className="flex items-center gap-1.5 mt-0.5">
              <button onClick={() => setMyStatus((s) => s === "online" ? "busy" : s === "busy" ? "online" : "online")}
                className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full" style={{ background: T.panel }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: presenceDot(isOnline ? myStatus : "offline") }} />
                {isOnline ? (myStatus === "busy" ? "Busy — tap to change" : "Online — tap to set busy") : "Offline (queuing)"}
              </button>
            </div>
          </div>
          <button onClick={() => setShowNewChat(true)} title="New conversation"
            className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: T.panel }}>
            <AtSign size={14} style={{ color: T.navy }} />
          </button>
        </div>

        {!isOnline && outbox.length > 0 && (
          <div className="px-3 py-2 text-[11px] font-semibold" style={{ background: "#FDF3E2", color: "#9A6B17" }}>
            {outbox.length} message{outbox.length > 1 ? "s" : ""} queued — will send when you're back online.
          </div>
        )}

        {showNewChat && (
          <div className="border-b" style={{ borderColor: T.line, background: T.paper }}>
            <div className="p-3 pb-2 flex items-center justify-between">
              <div className="text-[11px] font-semibold" style={{ color: T.sub }}>Junction members — tap anyone to chat</div>
              <button onClick={() => { setShowNewChat(false); setDirectoryQuery(""); }} className="text-[11px] font-semibold px-2 py-1 rounded-md" style={{ background: T.panel, color: T.sub }}>Close</button>
            </div>
            <div className="px-3 pb-2">
              <input value={directoryQuery} onChange={(e) => setDirectoryQuery(e.target.value)}
                placeholder="Search by name…" className="w-full text-sm px-2.5 py-1.5 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            </div>
            {newChatError && <div className="px-3 text-[11px] mb-1.5" style={{ color: "#E0554C" }}>{newChatError}</div>}
            <div className="max-h-56 overflow-y-auto">
              {directoryLoading && <div className="px-3 py-2 text-xs" style={{ color: T.sub }}>Loading…</div>}
              {!directoryLoading && directory.length === 0 && (
                <div className="px-3 py-3 text-xs" style={{ color: T.sub }}>No one to show yet — as more people join Junction, they'll appear here.</div>
              )}
              {directory.map((u) => (
                <button key={u.id} onClick={() => startChatWith(u)}
                  className="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-black/5">
                  <div className="relative shrink-0">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: T.navy, color: "#fff" }}>
                      {(u.name || "?").slice(0, 1).toUpperCase()}
                    </div>
                    <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full border-2" style={{ background: presenceDot(u.status), borderColor: "#fff" }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>{u.name || "Junction member"}</div>
                    <div className="text-[11px] capitalize" style={{ color: T.sub }}>{u.role_label || u.status}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="overflow-y-auto flex-1">
          <button onClick={() => { setActiveId(JUNCTION_AI_THREAD_ID); setMobileView("chat"); }}
            className="w-full text-left p-3 border-b flex items-center gap-3"
            style={{ borderColor: T.line, background: activeId === JUNCTION_AI_THREAD_ID ? T.paper : "transparent" }}>
            <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: "linear-gradient(135deg,#00CFFF,#0E2A44)" }}>
              <Sparkles size={16} color="#fff" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold" style={{ color: T.ink }}>Junction AI</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#00CFFF22", color: "#00CFFF" }}>AI</span>
              </div>
              <span className="text-xs truncate block" style={{ color: T.sub }}>Ask about listings, areas, anything</span>
            </div>
          </button>

          {threads.length === 0 && (
            <div className="p-4 text-xs text-center" style={{ color: T.sub }}>
              No conversations yet. Message someone from a listing, or start one above with their email.
            </div>
          )}
          {threads.map((t) => {
            const otherId = (t.participant_ids || []).find((uid) => String(uid) !== String(currentUser.id));
            const status = presence[otherId] || "offline";
            return (
              <button key={t.id} onClick={() => {
                setActiveId(t.id); setMobileView("chat");
                if (currentUser?.id) fetch(`/api/conversations/${t.id}/messages`, { method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ readerId: currentUser.id }) }).catch(() => {});
                setThreads((prev) => prev.map((th) => th.id === t.id ? { ...th, unread_count: 0 } : th));
              }}
                className="w-full text-left p-3 border-b flex items-center gap-3"
                style={{ borderColor: T.line, background: t.id === activeId ? T.paper : "transparent" }}>
                <div className="relative shrink-0">
                  <Avatar name={`User ${otherId}`} size={40} />
                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: presenceDot(status), borderColor: "#fff" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold" style={{ color: T.ink }}>Junction User #{otherId}</div>
                  <span className="text-xs truncate block" style={{ color: T.sub }}>
                    {t.context_label || t.last_body || "New conversation"}
                  </span>
                </div>
                {t.unread_count > 0 && (
                  <span className="text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center" style={{ background: T.signal, color: "#04202A" }}>{t.unread_count}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className={`${mobileView === "list" ? "hidden" : "flex"} sm:flex flex-col flex-1`}>
        <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: T.line }}>
          <button onClick={() => setMobileView("list")} className="sm:hidden"><ArrowLeft size={18} style={{ color: T.ink }} /></button>
          {isAiThread ? (
            <>
              <div className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg,#00CFFF,#0E2A44)" }}>
                <Sparkles size={15} color="#fff" />
              </div>
              <div className="flex-1"><div className="text-sm font-semibold" style={{ color: T.ink }}>Junction AI</div></div>
            </>
          ) : activeThread ? (
            <>
              <div className="relative shrink-0">
                <Avatar name={`User ${otherUserId}`} size={36} />
                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2" style={{ background: presenceDot(presence[otherUserId] || "offline"), borderColor: "#fff" }} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-semibold" style={{ color: T.ink }}>Junction User #{otherUserId}</div>
                <div className="text-xs capitalize" style={{ color: T.sub }}>{presence[otherUserId] || "offline"}</div>
              </div>
              <button onClick={() => setActiveCall({ mode: "voice" })} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: T.paper }}><Phone size={16} style={{ color: T.navy }} /></button>
              <button onClick={() => setActiveCall({ mode: "video" })} className="w-9 h-9 rounded-full flex items-center justify-center" style={{ background: T.paper }}><Video size={16} style={{ color: T.navy }} /></button>
            </>
          ) : (
            <div className="text-sm" style={{ color: T.sub }}>Select a conversation</div>
          )}
        </div>

        <div ref={scrollRef} className="flex-1 p-4 flex flex-col gap-2 overflow-y-auto">
          {activeMessages.map((m, i) => {
            const mine = isAiThread ? m.from === "me" : String(m.sender_id) === String(currentUser.id);
            const isSystem = m.from === "system";
            const type = m.type || "text";
            const text = m.text ?? m.body;
            if (isSystem) return <div key={i} className="text-center text-xs py-1" style={{ color: T.sub }}>{text}</div>;
            return (
              <div key={m.id || i} className="flex items-end gap-2" style={{ alignSelf: mine ? "flex-end" : "flex-start", flexDirection: mine ? "row-reverse" : "row" }}>
                <div className="max-w-[70%] text-sm px-3 py-2 rounded-xl" style={{ background: mine ? T.navy : "#fff", color: mine ? "#fff" : T.ink, border: mine ? "none" : `1px solid ${T.line}` }}>
                  {type === "image" && m.media_url && <img src={m.media_url} className="rounded-lg mb-1 max-w-full" alt="attachment" />}
                  {type === "file" && m.media_url && <a href={m.media_url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 underline text-xs mb-1"><Upload size={12} />{m.media_meta?.name || "Attachment"}</a>}
                  {type === "voice" && m.media_url && <audio controls src={m.media_url} className="max-w-full" style={{ height: 32 }} />}
                  {type === "link" && m.media_meta && (
                    <div className="rounded-lg p-2 mb-1" style={{ background: mine ? "rgba(255,255,255,0.1)" : T.paper }}>
                      <div className="text-[11px] font-bold">{m.media_meta.label}</div>
                      {m.media_meta.price && <div className="text-[10px] opacity-80">{m.media_meta.price}</div>}
                    </div>
                  )}
                  {text}
                </div>
              </div>
            );
          })}
          {sending && isAiThread && (
            <div className="text-sm px-3 py-2 rounded-xl flex items-center gap-1" style={{ alignSelf: "flex-start", background: "#fff", border: `1px solid ${T.line}`, color: T.sub }}>
              <Loader2 size={13} className="animate-spin" /> Junction AI is typing…
            </div>
          )}
        </div>

        {showEmoji && (
          <div className="px-3 py-2 border-t flex gap-1.5 flex-wrap" style={{ borderColor: T.line }}>
            {UAE_REACTIONS.map((r) => (
              <button key={r.e} title={r.label} onClick={() => { setDraft((d) => d + r.e); setShowEmoji(false); }} className="text-lg hover:scale-125 transition-transform">{r.e}</button>
            ))}
          </div>
        )}

        <div className="p-3 border-t flex items-center gap-1.5" style={{ borderColor: T.line }}>
          <button onClick={() => setShowEmoji((s) => !s)} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paper }} title="UAE reactions">
            <Sparkles size={15} style={{ color: T.navy }} />
          </button>
          {!isAiThread && (
            <>
              <input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*,application/pdf"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndSend(f, f.type.startsWith("image/") ? "image" : f.type.startsWith("video/") ? "video" : "file"); e.target.value = ""; }} />
              <button onClick={() => fileInputRef.current?.click()} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paper }} title="Attach photo, video, or file">
                <Upload size={14} style={{ color: T.navy }} />
              </button>
              <button onClick={recording ? stopRecording : startRecording} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: recording ? "#E0554C" : T.paper }} title="Voice message">
                {recording ? <MicOff size={14} color="#fff" /> : <Mic size={14} style={{ color: T.navy }} />}
              </button>
            </>
          )}
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (isAiThread ? sendToAi() : send())}
            placeholder={isOnline ? "Type a message…" : "Offline — message will send when reconnected…"}
            disabled={sending}
            className="flex-1 text-sm px-3 py-2 rounded-lg border outline-none"
            style={{ borderColor: T.line }}
          />
          <button onClick={isAiThread ? sendToAi : send} disabled={sending} className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.navy, opacity: sending ? 0.6 : 1 }}>
            <Send size={15} color="#fff" />
          </button>
        </div>
      </div>

      {activeCall && activeThread && (
        <CallScreen contact={{ name: `Junction User #${otherUserId}`, online: (presence[otherUserId] || "offline") === "online" }} mode={activeCall.mode} onEnd={() => setActiveCall(null)} />
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
    p.listingChain?.some((c) => (c.listedBy || c.name || "").includes("Yousef K."))
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

      <div className="flex items-center justify-between mt-3 px-1">
        <ViewedByBadge count={87} note="9 from Community Circles"/>
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

// ---------------------------------------------------------------
// SETTINGS — theme, notifications, text size, language
// ---------------------------------------------------------------
// Small skyline silhouette used as a decorative motif on the New to
// UAE hero — evokes Downtown/Marina without depicting any specific
// building, so it reads as "Dubai skyline" rather than a copyrighted
// building likeness.
function SkylineSilhouette({ tint = "rgba(255,255,255,0.14)" }) {
  return (
    <svg viewBox="0 0 400 90" preserveAspectRatio="none" className="absolute bottom-0 left-0 w-full" style={{ height: 70 }}>
      <polygon points="0,90 0,55 18,55 18,40 34,40 34,60 52,60 52,30 60,10 68,30 68,60 90,60 90,45 108,45 108,65 130,65 130,20 138,20 138,65 160,65 160,50 182,50 182,70 205,70 205,35 213,35 213,70 235,70 235,55 255,55 255,25 262,10 269,25 269,55 292,55 292,68 315,68 315,42 328,42 328,68 350,68 350,58 370,58 370,72 400,72 400,90"
        fill={tint} />
    </svg>
  );
}

// ---------------------------------------------------------------
// Top 10 nationalities by resident population in the UAE (2025/26
// estimates — FCSC/GMI/Wikipedia demographic breakdowns). Shown first
// in "New to UAE" since these are, statistically, who is actually
// arriving. A "More countries worldwide" expansion covers everyone else.
// ---------------------------------------------------------------
const UAE_TOP_ORIGIN_COUNTRIES = [
  "India","Pakistan","Bangladesh","Philippines","Iran",
  "Egypt","Nepal","Sri Lanka","China","United Kingdom",
];
const WORLD_COUNTRIES_MORE = [
  "United States","Canada","France","Germany","Russia","Nigeria","South Africa","Kenya","Ethiopia","Ghana",
  "Sudan","Morocco","Algeria","Tunisia","Libya","Jordan","Lebanon","Syria","Iraq","Yemen",
  "Saudi Arabia","Kuwait","Qatar","Bahrain","Oman","Turkey","Afghanistan","Indonesia","Malaysia","Thailand",
  "Vietnam","South Korea","Japan","Australia","New Zealand","Italy","Spain","Portugal","Netherlands","Belgium",
  "Switzerland","Sweden","Norway","Ukraine","Poland","Romania","Greece","Brazil","Mexico","Argentina",
  "Colombia","Uganda","Somalia","Tanzania","Zimbabwe","Cameroon","Senegal","Ivory Coast","Uzbekistan","Kazakhstan",
  "Georgia","Armenia","Azerbaijan","Israel","Palestine","Myanmar","Bhutan","Maldives","Singapore","Other",
];

function NewcomerJourney({ onComplete, onGoTo }) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({ from:"", family:"single", budget:"", purpose:"rent", lifestyle:"" });
  const [showMoreCountries, setShowMoreCountries] = useState(false);
  const [countrySearch, setCountrySearch] = useState("");
  const upd = (k,v) => setAnswers(a=>({...a,[k]:v}));
  const steps = [
    { q:"Where are you arriving from?", f:"from", icon:Globe2, opts:UAE_TOP_ORIGIN_COUNTRIES },
    { q:"Who are you moving with?", f:"family", icon:Users, opts:["Just me","Partner","Partner + children","Extended family"] },
    { q:"Monthly housing budget?", f:"budget", icon:CreditCard, opts:["Under AED 5,000","AED 5,000–8,000","AED 8,000–15,000","AED 15,000–25,000","Above AED 25,000"] },
    { q:"Rent or buy?", f:"purpose", icon:Building2, opts:["Rent","Buy","Not sure yet"] },
    { q:"What matters most daily?", f:"lifestyle", icon:Heart, opts:["Near metro / no car","Good schools nearby","Quiet residential","Vibrant dining & nightlife","Beach access","Near my community"] },
  ];
  const areas = { "Rent":["Deira","Al Nahda","JVC","International City","Discovery Gardens"], "Buy":["Dubai Marina","Downtown","Business Bay","Dubai Hills","Creek Harbour"], "Not sure yet":["Dubai Marina","JVC","Al Barsha","Deira","Business Bay"] };
  const filteredWorldCountries = WORLD_COUNTRIES_MORE.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()));

  const HeroHeader = ({ title, subtitle }) => (
    <div className="relative overflow-hidden rounded-2xl mb-5 px-5 pt-6 pb-9"
      style={{ background: "linear-gradient(135deg,#0E2A44 0%,#163A5C 45%,#5B9EFF 130%)" }}>
      <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full" style={{ background: "radial-gradient(circle,rgba(0,207,255,0.35),transparent 70%)" }} />
      <SkylineSilhouette />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🇦🇪</span>
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff", letterSpacing: 0.5 }}>
            NEW TO UAE
          </span>
        </div>
        <h2 style={{fontFamily:"'Space Grotesk',sans-serif",color:"#fff"}} className="text-xl font-bold leading-tight">{title}</h2>
        {subtitle && <p className="text-xs mt-1.5 max-w-xs" style={{color:"rgba(255,255,255,0.75)"}}>{subtitle}</p>}
      </div>
      <div className="absolute bottom-0 left-0 right-0"><UAEFlagStripe height={3} rounded={false} /></div>
    </div>
  );

  if (step >= steps.length) {
    const recs = areas[answers.purpose] || areas["Rent"];
    const tools = [
      { id:"verify", label:"Get your Emirates ID verified", sub:"Unlocks listing, chatting & applying", icon:ShieldCheck, color:"#1F7A4D", go:"passport" },
      { id:"souk", label:"Find movers & home services", sub:"Cleaners, movers, AC techs — verified", icon:Wrench, color:"#5B9EFF", go:"souk" },
      { id:"jobs", label:"Browse jobs matched to you", sub:"Zero fees for job seekers, ever", icon:Briefcase, color:"#C9A227", go:"jobs" },
      { id:"connect", label:"Message a local agent", sub:"Ask anything about your new area", icon:MessageCircle, color:"#00CFFF", go:"messages" },
    ];
    return (
      <div className="p-4 max-w-md mx-auto">
        <HeroHeader title="Welcome to Junction, citizen." subtitle="Based on your profile, here are your best-matched areas in the UAE." />
        <div className="flex flex-col gap-2 mb-5">
          {recs.map((area,i)=>(
            <div key={area} className="flex items-center gap-3 p-3 rounded-xl border relative overflow-hidden"
              style={{borderColor: i===0 ? T.signal : T.line, background: i===0 ? `${T.signal}0A` : T.paper}}>
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{background: i===0 ? "linear-gradient(135deg,#00CFFF,#0E2A44)" : T.navy}}>{i+1}</div>
              <div className="flex-1">
                <div className="text-sm font-semibold flex items-center gap-1.5" style={{color:T.ink}}>
                  {area} {i===0 && <Sparkles size={12} style={{color:T.signal}} />}
                </div>
                <div className="text-[10px]" style={{color:T.sub}}>{i===0?"Best match for your profile":"Strong match"}</div>
              </div>
              <Globe2 size={13} style={{color:T.signal}}/>
            </div>
          ))}
        </div>

        <div className="text-[11px] p-3 rounded-xl mb-5"
          style={{background:"#00CFFF12",color:"#1A5A7A",border:"1px solid #00CFFF22"}}>
          Junction matched these areas to your profile. Listings from every area are visible to you right now
          — no registration required. Register when you're ready to contact an agent or make an offer.
        </div>

        <div className="text-xs font-semibold mb-2" style={{color:T.sub}}>Your first-week toolkit</div>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {tools.map((t) => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => onGoTo && onGoTo(t.go)}
                className="text-left p-3 rounded-xl border flex flex-col gap-2"
                style={{ borderColor: T.line, background: "#fff" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${t.color}18` }}>
                  <Icon size={15} style={{ color: t.color }} />
                </div>
                <div>
                  <div className="text-[11px] font-semibold leading-tight" style={{ color: T.ink }}>{t.label}</div>
                  <div className="text-[10px] mt-0.5" style={{ color: T.sub }}>{t.sub}</div>
                </div>
              </button>
            );
          })}
        </div>

        <button onClick={onComplete}
          className="w-full text-sm font-bold py-3 rounded-xl"
          style={{background:"linear-gradient(135deg,#00CFFF,#0E2A44)",color:"#fff",
            fontFamily:"'Space Grotesk',sans-serif",boxShadow:"0 0 18px rgba(0,207,255,.4)"}}>
          Enter Junction as a citizen →
        </button>
      </div>
    );
  }
  const cur = steps[step];
  const CurIcon = cur.icon;
  return (
    <div className="p-4 max-w-md mx-auto">
      <HeroHeader title="Let's set you up in the UAE" subtitle="Five quick questions — then we match you to real areas, not guesses." />
      <div className="flex items-center gap-2 mb-4">
        <div className="text-[11px] font-semibold shrink-0" style={{color:T.sub}}>{step+1}/{steps.length}</div>
        <div className="flex-1 h-1.5 rounded-full overflow-hidden flex gap-0.5" style={{background:T.line}}>
          {steps.map((_, i) => (
            <div key={i} className="h-full flex-1 rounded-full" style={{
              background: i <= step ? "linear-gradient(90deg,#00CFFF,#5B9EFF)" : "transparent",
              transition: "background .3s",
            }} />
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${T.signal}18` }}>
          <CurIcon size={17} style={{ color: T.signal }} />
        </div>
        <h2 style={{fontFamily:"'Space Grotesk',sans-serif",color:T.ink}} className="text-lg font-bold">
          {cur.q}
        </h2>
      </div>
      {cur.f === "from" ? (
        <div>
          <div className="text-[10px] font-semibold uppercase mb-2" style={{ color: T.sub, letterSpacing: 0.5 }}>
            Most residents arrive from
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {UAE_TOP_ORIGIN_COUNTRIES.map((opt) => (
              <button key={opt}
                onClick={()=>{ upd(cur.f,opt); setTimeout(()=>setStep(s=>s+1),200); }}
                className="text-left px-3 py-2.5 rounded-xl border text-sm font-medium flex items-center justify-between"
                style={{
                  borderColor:answers[cur.f]===opt?T.signal:T.line,
                  background:answers[cur.f]===opt?`${T.signal}12`:T.paper,
                  color:T.ink,transition:"all .2s",
                }}>
                {opt}
                {answers[cur.f]===opt && <CheckCircle2 size={14} style={{ color: T.signal }} />}
              </button>
            ))}
          </div>

          {!showMoreCountries ? (
            <button onClick={() => setShowMoreCountries(true)}
              className="w-full text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center justify-center gap-1.5"
              style={{ background: T.panel, color: T.navy, border: `1px solid ${T.line}` }}>
              <Globe2 size={13} /> More countries worldwide
            </button>
          ) : (
            <div className="rounded-xl border p-3" style={{ borderColor: T.line, background: "#fff" }}>
              <div className="flex items-center gap-2 mb-3 px-2.5 py-2 rounded-lg" style={{ background: T.paper }}>
                <Search size={13} style={{ color: T.sub }} />
                <input
                  value={countrySearch}
                  onChange={(e) => setCountrySearch(e.target.value)}
                  placeholder="Search any country…"
                  className="flex-1 bg-transparent text-sm outline-none"
                  style={{ color: T.ink }}
                  autoFocus
                />
              </div>
              <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                {filteredWorldCountries.length === 0 ? (
                  <div className="text-xs text-center py-4" style={{ color: T.sub }}>No matches — try another spelling.</div>
                ) : filteredWorldCountries.map((opt) => (
                  <button key={opt}
                    onClick={()=>{ upd(cur.f,opt); setTimeout(()=>setStep(s=>s+1),200); }}
                    className="text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center justify-between"
                    style={{
                      background:answers[cur.f]===opt?`${T.signal}12`:"transparent",
                      color:T.ink,
                    }}>
                    {opt}
                    {answers[cur.f]===opt && <CheckCircle2 size={14} style={{ color: T.signal }} />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {cur.opts.map(opt=>(
            <button key={opt}
              onClick={()=>{ upd(cur.f,opt); setTimeout(()=>setStep(s=>s+1),200); }}
              className="text-left px-4 py-3 rounded-xl border text-sm font-medium flex items-center justify-between"
              style={{
                borderColor:answers[cur.f]===opt?T.signal:T.line,
                background:answers[cur.f]===opt?`${T.signal}12`:T.paper,
                color:T.ink,transition:"all .2s",
              }}>
              {opt}
              {answers[cur.f]===opt && <CheckCircle2 size={15} style={{ color: T.signal }} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------
// JUNCTION WORK — Jobs marketplace
// Zero agency fees for seekers. Verified companies post jobs.
// Verified citizens with ID/passport post profiles.
// Junction charges first month salary from EMPLOYER only on placement.
// ---------------------------------------------------------------
function JobReelCard({ item, onApply, onContact }) {
  const isJob = item.type === "job";
  return (
    <div className="relative w-full h-full flex flex-col justify-end overflow-hidden"
      style={{ background:`linear-gradient(160deg,${item.grad[0]},${item.grad[1]} 75%)` }}>
      <div className="absolute inset-0"
        style={{ background:"radial-gradient(circle at 75% 20%,rgba(255,255,255,.08),transparent 50%)" }}/>

      {/* Badges top */}
      <div className="absolute top-4 left-4 flex gap-1.5 z-10 flex-wrap">
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background:"rgba(0,0,0,.45)", color:"#fff" }}>
          <Briefcase size={10}/> {isJob ? "Job" : "Seeker"}
        </span>
        {isJob && item.urgent && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full"
            style={{ background:"#FF5A36", color:"#fff" }}>Urgent</span>
        )}
        {!isJob && item.idVerified && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
            style={{ background:"#1F7A4D", color:"#fff" }}>
            <BadgeCheck size={10}/> ID Verified
          </span>
        )}
        {isJob && item.companyVerified && (
          <span className="text-[11px] font-semibold px-2 py-1 rounded-full flex items-center gap-1"
            style={{ background:"#1F7A4D", color:"#fff" }}>
            <ShieldCheck size={10}/> Verified Company
          </span>
        )}
      </div>

      {/* Right rail */}
      <div className="absolute right-3 bottom-32 flex flex-col items-center gap-5 z-10">
        <button onClick={() => onApply(item)} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background:"rgba(255,255,255,.15)" }}>
            <Briefcase size={18} color="#fff"/>
          </div>
          <span className="text-[10px] font-semibold text-white">{isJob?"Apply":"Hire"}</span>
        </button>
        <button onClick={() => onContact(item)} className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background:"rgba(255,255,255,.15)" }}>
            <MessageCircle size={18} color="#fff"/>
          </div>
          <span className="text-[10px] font-semibold text-white">Message</span>
        </button>
        <button className="flex flex-col items-center gap-1">
          <div className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background:"rgba(255,255,255,.15)" }}>
            <Share2 size={18} color="#fff"/>
          </div>
          <span className="text-[10px] font-semibold text-white">Share</span>
        </button>
      </div>

      {/* Bottom info */}
      <div className="relative z-10 p-4 pr-20 pb-6">
        {isJob ? (
          <>
            <div className="text-white text-xl font-bold mb-0.5"
              style={{ fontFamily:"'Space Grotesk',sans-serif" }}>{item.title}</div>
            <div className="text-white text-sm opacity-90 mb-1">{item.company}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-xs opacity-80 flex items-center gap-1">
                <MapPin size={11}/> {item.location}
              </span>
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{ background:"rgba(255,255,255,.2)", color:"#fff" }}>
                {item.applicants} applied
              </span>
            </div>
            <div className="text-white font-semibold text-sm mb-2"
              style={{ fontFamily:"'IBM Plex Mono',monospace" }}>{item.salary}</div>
            <div className="text-[11px] px-2 py-1 rounded-lg flex items-center gap-1"
              style={{ background:"rgba(31,122,77,.5)", color:"#fff" }}>
              <HandCoins size={11}/> Zero fee to applicant — Junction charges employer only
            </div>
          </>
        ) : (
          <>
            <div className="text-white text-xl font-bold mb-0.5"
              style={{ fontFamily:"'Space Grotesk',sans-serif" }}>{item.name}</div>
            <div className="text-white text-sm opacity-90 mb-1">{item.title}</div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-white text-xs opacity-80 flex items-center gap-1">
                <MapPin size={11}/> {item.location}
              </span>
              <span className="text-white text-xs opacity-80">
                {item.experience} experience
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mb-2">
              {item.languages.map(l => (
                <span key={l} className="text-[10px] px-2 py-0.5 rounded-full"
                  style={{ background:"rgba(255,255,255,.2)", color:"#fff" }}>{l}</span>
              ))}
            </div>
            <div className="text-[11px] text-white opacity-85 line-clamp-2">{item.bio}</div>
          </>
        )}
        <div className="text-[10px] mt-1 opacity-60 text-white">{item.posted}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// WORK REELS — one shared, full-screen swipeable reel that Souk
// (Services) and Junction Work both open. Same feed, same cards,
// same experience whichever door you walk in from: mixes services,
// job openings, and candidate reels into a single vertical scroll.
// ---------------------------------------------------------------
function WorkReels({ items, onChat, onApply, emptyLabel = "Nothing here yet." }) {
  const [liked, setLiked] = useState({});
  return (
    <div className="overflow-y-scroll h-full" style={{ scrollSnapType: "y mandatory", background: "#0A0F1A" }}>
      {items.length === 0 && (
        <div className="h-full flex items-center justify-center text-sm px-6 text-center" style={{ color: "#fff" }}>
          {emptyLabel}
        </div>
      )}
      {items.map((entry, idx) => (
        <div key={`${entry.kind}-${entry.id}`} className="h-full" style={{ scrollSnapAlign: "start" }}>
          {entry.kind === "service" ? (
            <ServiceReelCard
              s={entry}
              liked={!!liked[entry.id]}
              isFirst={idx === 0}
              onLike={() => setLiked((p) => ({ ...p, [entry.id]: !p[entry.id] }))}
              onChat={onChat}
              onCall={() => {}}
            />
          ) : (
            <JobReelCard item={entry} onApply={onApply} onContact={() => {}} />
          )}
        </div>
      ))}
    </div>
  );
}

function JobCard({ item, onApply, onContact }) {
  const isJob = item.type === "job";
  return (
    <div className="rounded-2xl border overflow-hidden mb-3"
      style={{ borderColor:"#DCE4ED", background:"#fff" }}>
      <div className="h-2 w-full" style={{ background:`linear-gradient(90deg,${item.grad[0]},${item.grad[1]})` }}/>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1">
            <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
              {isJob && item.urgent && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background:"#FF5A3618", color:"#FF5A36", border:"1px solid #FF5A3644" }}>
                  Urgent
                </span>
              )}
              {isJob && item.companyVerified && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background:"#1F7A4D18", color:"#1F7A4D", border:"1px solid #1F7A4D44" }}>
                  <ShieldCheck size={9}/> Verified
                </span>
              )}
              {!isJob && item.idVerified && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex items-center gap-1"
                  style={{ background:"#1F7A4D18", color:"#1F7A4D", border:"1px solid #1F7A4D44" }}>
                  <BadgeCheck size={9}/> ID Verified
                </span>
              )}
              {!isJob && !item.idVerified && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                  style={{ background:"#C9A22718", color:"#856404", border:"1px solid #C9A22744" }}>
                  Verification pending
                </span>
              )}
            </div>
            <div className="text-sm font-bold" style={{ color:"#0A0F1A" }}>
              {isJob ? item.title : item.name}
            </div>
            <div className="text-xs mt-0.5" style={{ color:"#7B8AA0" }}>
              {isJob ? item.company : item.title}
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background:`linear-gradient(135deg,${item.grad[0]},${item.grad[1]})` }}>
            {isJob ? <Briefcase size={16} color="#fff"/> : <GraduationCap size={16} color="#fff"/>}
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs mb-2" style={{ color:"#7B8AA0" }}>
          <span className="flex items-center gap-1"><MapPin size={11}/>{isJob?item.location:item.location}</span>
          {isJob && <span className="flex items-center gap-1"><Users size={11}/>{item.applicants} applied</span>}
          {!isJob && <span>{item.experience} exp.</span>}
          <span style={{ color:"#7B8AA0" }}>{item.posted}</span>
        </div>

        {isJob && (
          <div className="text-sm font-semibold mb-2"
            style={{ color:"#0E2A44", fontFamily:"'IBM Plex Mono',monospace" }}>
            {item.salary}
          </div>
        )}

        {!isJob && (
          <div className="flex flex-wrap gap-1 mb-2">
            {item.languages.map(l=>(
              <span key={l} className="text-[10px] px-2 py-0.5 rounded-full"
                style={{ background:"#F4F7FA", color:"#7B8AA0", border:"1px solid #DCE4ED" }}>{l}</span>
            ))}
          </div>
        )}

        <p className="text-xs mb-3 line-clamp-2" style={{ color:"#7B8AA0" }}>
          {isJob ? item.description : item.bio}
        </p>

        {isJob && (
          <div className="flex items-center gap-1.5 text-[11px] mb-3 px-2 py-1.5 rounded-lg"
            style={{ background:"#1F7A4D12", color:"#1F7A4D", border:"1px solid #1F7A4D33" }}>
            <HandCoins size={12}/> <b>Zero fee to applicant.</b>&nbsp;Junction charges employer first month salary on placement only.
          </div>
        )}

        <div className="flex gap-2">
          <button onClick={() => onApply(item)}
            className="flex-1 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
            style={{ background:"#0E2A44", color:"#fff" }}>
            <Briefcase size={12}/> {isJob ? "Apply now" : "Contact & hire"}
          </button>
          <button onClick={() => onContact(item)}
            className="text-xs font-semibold py-2.5 px-3 rounded-xl flex items-center gap-1"
            style={{ background:"#F4F7FA", color:"#0E2A44", border:"1px solid #DCE4ED" }}>
            <MessageCircle size={12}/> Chat
          </button>
        </div>
      </div>
    </div>
  );
}

function PostJobModal({ onClose, onPublish, verifyStatuses }) {
  const [mode, setMode] = useState("job"); // "job" or "seeker"
  const [form, setForm] = useState({
    title:"", company:"", location:"", emirate:"Dubai",
    salary:"", category:JOB_CATEGORIES[0], description:"",
    name:"", experience:"", languages:"", bio:"", openTo:"Full time",
  });
  const upd = (k,v) => setForm(f=>({...f,[k]:v}));
  const isCompanyVerified = (verifyStatuses["TRADE_LICENSE"]||"none") === "verified"
    || (verifyStatuses["RERA_DLD"]||"none") === "verified";
  const hasId = (verifyStatuses["EMIRATES_ID"]||"none") === "verified";

  return (
    <div className="fixed inset-0 z-30 flex items-end sm:items-center justify-center"
      style={{ background:"rgba(0,0,0,.5)" }}>
      <div className="w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl flex flex-col"
        style={{ background:"#fff", height:"min(88vh,620px)", minHeight:0 }}>
        <div className="flex items-center justify-between p-4 border-b shrink-0"
          style={{ borderColor:"#DCE4ED" }}>
          <div style={{ fontFamily:"'Space Grotesk',sans-serif", color:"#0A0F1A" }}
            className="text-base font-bold">Post on Junction Work</div>
          <button onClick={onClose}><X size={18} style={{ color:"#7B8AA0" }}/></button>
        </div>

        {/* Mode toggle */}
        <div className="flex p-3 gap-2 shrink-0" style={{ borderBottom:"1px solid #DCE4ED" }}>
          {[["job","Post a Job","Briefcase"],["seeker","I'm Looking for Work","GraduationCap"]].map(([m,label])=>(
            <button key={m} onClick={() => setMode(m)}
              className="flex-1 text-xs font-bold py-2.5 rounded-xl"
              style={{
                background: mode===m?"#0E2A44":"#F4F7FA",
                color: mode===m?"#fff":"#7B8AA0",
              }}>{label}</button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2.5" style={{ minHeight:0 }}>
          {mode === "job" ? (
            <>
              {!isCompanyVerified && (
                <div className="p-3 rounded-xl text-xs flex items-start gap-2"
                  style={{ background:"#FFF3CD", color:"#856404" }}>
                  <ShieldCheck size={14} className="shrink-0 mt-0.5"/>
                  <span>Only verified companies can post jobs. Get your Trade Licence or RERA card verified in the Verify tab first. This protects job seekers from scammers.</span>
                </div>
              )}
              <input placeholder="Job title" value={form.title} onChange={e=>upd("title",e.target.value)}
                disabled={!isCompanyVerified}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none"
                style={{ borderColor:"#DCE4ED", opacity:isCompanyVerified?1:.5 }}/>
              <input placeholder="Company name" value={form.company} onChange={e=>upd("company",e.target.value)}
                disabled={!isCompanyVerified}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none"
                style={{ borderColor:"#DCE4ED", opacity:isCompanyVerified?1:.5 }}/>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Area / Location" value={form.location} onChange={e=>upd("location",e.target.value)}
                  className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}/>
                <select value={form.emirate} onChange={e=>upd("emirate",e.target.value)}
                  className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}>
                  <option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option>
                  <option>Ajman</option><option>Ras Al Khaimah</option>
                </select>
              </div>
              <select value={form.category} onChange={e=>upd("category",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}>
                {JOB_CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}
              </select>
              <input placeholder="Salary range (e.g. AED 8,000–12,000/month)"
                value={form.salary} onChange={e=>upd("salary",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none"
                style={{ borderColor:"#DCE4ED", fontFamily:"'IBM Plex Mono',monospace" }}/>
              <textarea placeholder="Job description and requirements…" rows={3}
                value={form.description} onChange={e=>upd("description",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none resize-none"
                style={{ borderColor:"#DCE4ED" }}/>
              <div className="p-3 rounded-xl text-xs flex items-start gap-2"
                style={{ background:"#1F7A4D12", color:"#1F7A4D", border:"1px solid #1F7A4D33" }}>
                <HandCoins size={13} className="shrink-0 mt-0.5"/>
                <span>Junction charges <b>one month salary from your company</b> only after a successful placement. <b>Zero cost ever to the job seeker.</b> This is how we end agency fee scams in UAE.</span>
              </div>
            </>
          ) : (
            <>
              {!hasId && (
                <div className="p-3 rounded-xl text-xs flex items-start gap-2"
                  style={{ background:"#FFF3CD", color:"#856404" }}>
                  <BadgeCheck size={14} className="shrink-0 mt-0.5"/>
                  <span>Verify your Emirates ID or passport in the Verify tab to get the verified badge on your profile. You can still post without it — but verified profiles get 4x more responses.</span>
                </div>
              )}
              <input placeholder="Your full name" value={form.name} onChange={e=>upd("name",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}/>
              <input placeholder="Your job title / profession" value={form.title} onChange={e=>upd("title",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}/>
              <select value={form.category} onChange={e=>upd("category",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}>
                {JOB_CATEGORIES.map(cat=><option key={cat}>{cat}</option>)}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <input placeholder="Years experience" value={form.experience} onChange={e=>upd("experience",e.target.value)}
                  className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}/>
                <input placeholder="Languages spoken" value={form.languages} onChange={e=>upd("languages",e.target.value)}
                  className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <select value={form.emirate} onChange={e=>upd("emirate",e.target.value)}
                  className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}>
                  <option>Dubai</option><option>Abu Dhabi</option><option>Sharjah</option>
                  <option>Ajman</option><option>Ras Al Khaimah</option>
                </select>
                <select value={form.openTo} onChange={e=>upd("openTo",e.target.value)}
                  className="text-sm px-3 py-2.5 rounded-xl border outline-none" style={{ borderColor:"#DCE4ED" }}>
                  <option>Full time</option><option>Part time</option>
                  <option>Contract</option><option>Commission based</option>
                </select>
              </div>
              <textarea placeholder="Tell employers about yourself — experience, skills, what you are looking for…" rows={3}
                value={form.bio} onChange={e=>upd("bio",e.target.value)}
                className="text-sm px-3 py-2.5 rounded-xl border outline-none resize-none"
                style={{ borderColor:"#DCE4ED" }}/>
              <div className="p-3 rounded-xl text-xs"
                style={{ background:"#00CFFF12", color:"#1A5A7A", border:"1px solid #00CFFF22" }}>
                Junction Work is <b>completely free for job seekers.</b> No registration fee, no CV fee, no agency fee. We only charge employers — and only after they hire you successfully.
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t shrink-0" style={{ borderColor:"#DCE4ED" }}>
          <button
            onClick={() => {
              const grad = JOB_LISTINGS[Math.floor(Math.random()*JOB_LISTINGS.length)].grad;
              if (mode === "job") {
                onPublish({
                  id:`j${Date.now()}`, type:"job",
                  title:form.title||"New Position",
                  company:form.company||"Company",
                  companyVerified:isCompanyVerified,
                  location:form.location||form.emirate,
                  emirate:form.emirate, salary:form.salary||"Competitive",
                  category:form.category, posted:"Just now",
                  description:form.description||"",
                  requirements:[], applicants:0, urgent:false,
                  grad, agencyFee:"First month salary — employer only",
                });
              } else {
                onPublish({
                  id:`sk${Date.now()}`, type:"seeker",
                  name:form.name||"Anonymous",
                  title:form.title||"Looking for work",
                  location:form.emirate, emirate:form.emirate,
                  experience:form.experience||"—",
                  category:form.category, posted:"Just now",
                  languages:form.languages?form.languages.split(",").map(l=>l.trim()):[],
                  idVerified:hasId, bio:form.bio||"",
                  grad, openTo:[form.openTo],
                });
              }
            }}
            className="w-full text-sm font-bold py-3 rounded-xl"
            style={{ background:"linear-gradient(135deg,#0E2A44,#163A5C)", color:"#fff",
              fontFamily:"'Space Grotesk',sans-serif" }}>
            {mode==="job" ? "Post this job" : "Post my profile"}
          </button>
        </div>
      </div>
    </div>
  );
}

function JobsView({ verifyStatuses, currentUser, onSignIn, services }) {
  const [filter, setFilter] = useState("all"); // "all" | "jobs" | "seekers" | "foryou"
  const [category, setCategory] = useState("All");
  const [showPost, setShowPost] = useState(false);
  const [jobView, setJobView] = useState("feed"); // "feed" | "reels"
  const [jobs, setJobs] = useState([...JOB_LISTINGS, ...SEEKER_PROFILES]);
  const [applyModal, setApplyModal] = useState(null);
  const [candidateProfile, setCandidateProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileDraft, setProfileDraft] = useState({ category: "", emirate: "Dubai", experience: "", languages: "" });
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) { setCandidateProfile(null); return; }
    setProfileLoading(true);
    fetch(`/api/people?action=candidate&userId=${currentUser.id}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setCandidateProfile(data?.profile || null))
      .catch(() => setCandidateProfile(null))
      .finally(() => setProfileLoading(false));
  }, [currentUser?.id]);

  const saveCandidateProfile = async () => {
    if (!currentUser?.id || !profileDraft.category) return;
    setSavingProfile(true);
    const profile = {
      category: profileDraft.category,
      emirate: profileDraft.emirate,
      experience: profileDraft.experience,
      languages: profileDraft.languages.split(",").map((l) => l.trim()).filter(Boolean),
    };
    try {
      const res = await fetch("/api/people?action=candidate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...profile }),
      });
      if (res.ok) setCandidateProfile(profile);
      else alert("Heads up — this didn't save to the database, but is showing locally for this session.");
    } catch (e) {
      setCandidateProfile(profile);
      alert(`Couldn't reach the server — ${e.message}. Showing locally for now.`);
    } finally {
      setSavingProfile(false);
    }
  };

  const matches = candidateProfile ? matchJobsForCandidate(candidateProfile, jobs) : [];

  const cats = ["All", ...JOB_CATEGORIES.slice(0,10)];

  const filtered = jobs.filter(j => {
    if (filter==="jobs" && j.type!=="job") return false;
    if (filter==="seekers" && j.type!=="seeker") return false;
    if (category!=="All" && j.category!==category) return false;
    return true;
  });

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 pb-0">
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 style={{ fontFamily:"'Space Grotesk',sans-serif", color:"#0A0F1A" }}
              className="text-2xl font-bold">Junction Work</h1>
            <p className="text-xs mt-0.5" style={{ color:"#7B8AA0" }}>
              Zero fees for job seekers · Verified companies only · No scams
            </p>
          </div>
          <button onClick={()=>setShowPost(true)}
            className="text-xs font-bold px-3 py-2 rounded-xl shrink-0"
            style={{ background:"linear-gradient(135deg,#0E2A44,#163A5C)", color:"#fff" }}>
            + Post
          </button>
        </div>

        {/* Anti-scam banner */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl mb-3 mt-2"
          style={{ background:"#1F7A4D12", border:"1px solid #1F7A4D33" }}>
          <HandCoins size={14} style={{ color:"#1F7A4D", flexShrink:0 }}/>
          <p className="text-[11px]" style={{ color:"#1F7A4D" }}>
            <b>Junction ends agency fee scams.</b> Job seekers pay nothing — ever. Junction charges the hiring company one month salary only after successful placement.
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-3">
          {[["all","All"],["jobs","Jobs"],["seekers","Seekers"],["foryou","For You"]].map(([v,l])=>(
            <button key={v} onClick={()=>setFilter(v)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
              style={{
                background:filter===v?"#0E2A44":"#F4F7FA",
                color:filter===v?"#fff":"#7B8AA0",
              }}>{v==="foryou" && <Sparkles size={11}/>}{l}</button>
          ))}
          <div className="flex-1"/>
          <button onClick={()=>setJobView(v=>v==="feed"?"reels":"feed")}
            className="text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1"
            style={{ background:"#F4F7FA", color:"#7B8AA0" }}>
            {jobView==="feed"?<><PlayCircle size={11}/>Reels</>:<><LayoutGrid size={11}/>Feed</>}
          </button>
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 mb-2">
          {cats.map(cat=>(
            <button key={cat} onClick={()=>setCategory(cat)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap shrink-0"
              style={{
                background:category===cat?"#0E2A44":"#F4F7FA",
                color:category===cat?"#fff":"#7B8AA0",
                border:`1px solid ${category===cat?"#0E2A44":"#DCE4ED"}`,
              }}>{cat}</button>
          ))}
        </div>
      </div>

      {/* Stats row */}
      <div className="px-4 mb-3">
        <div className="grid grid-cols-3 gap-2">
          {[
            [jobs.filter(j=>j.type==="job").length.toString(),"Live jobs","#0E2A44"],
            [jobs.filter(j=>j.type==="seeker").length.toString(),"Seekers","#1F7A4D"],
            ["AED 0","Your cost","#FF5A36"],
          ].map(([val,label,color])=>(
            <div key={label} className="rounded-xl p-2 text-center"
              style={{ background:"#F4F7FA", border:"1px solid #DCE4ED" }}>
              <div className="text-base font-bold" style={{ color }}>{val}</div>
              <div className="text-[10px]" style={{ color:"#7B8AA0" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      {filter === "foryou" ? (
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {!currentUser ? (
            <div className="text-center py-10">
              <p className="text-sm mb-3" style={{ color:"#7B8AA0" }}>
                Sign in to get jobs matched to you — Junction scores every open listing against your profile so you don't have to search.
              </p>
              <button onClick={onSignIn} className="text-xs font-bold px-4 py-2.5 rounded-xl"
                style={{ background:"#0E2A44", color:"#fff" }}>Sign In</button>
            </div>
          ) : profileLoading ? (
            <div className="text-center py-10 text-sm" style={{ color:"#7B8AA0" }}>Loading your profile…</div>
          ) : !candidateProfile ? (
            <div className="rounded-2xl p-4" style={{ background:"#F4F7FA", border:"1px solid #DCE4ED" }}>
              <div className="text-sm font-bold mb-1" style={{ color:"#0A0F1A", fontFamily:"'Space Grotesk',sans-serif" }}>
                Build your match profile
              </div>
              <p className="text-xs mb-3" style={{ color:"#7B8AA0" }}>
                Fill this once — Junction will surface matching jobs automatically from then on, before you ever post anything.
              </p>
              <label className="text-[11px] font-semibold block mb-1" style={{ color:"#0A0F1A" }}>Sector</label>
              <select
                value={profileDraft.sector || ""}
                onChange={(e) => setProfileDraft((p) => ({ ...p, sector: e.target.value, category: "" }))}
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2"
                style={{ borderColor:"#DCE4ED" }}>
                <option value="">Select a sector…</option>
                {JUNCTION_SECTORS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <label className="text-[11px] font-semibold block mb-1" style={{ color:"#0A0F1A" }}>Job title</label>
              <select
                value={profileDraft.category}
                onChange={(e) => setProfileDraft((p) => ({ ...p, category: e.target.value }))}
                disabled={!profileDraft.sector}
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2"
                style={{ borderColor:"#DCE4ED" }}>
                <option value="">Select your role…</option>
                {(JUNCTION_SECTORS.find((s) => s.id === profileDraft.sector)?.titles || []).map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
              <label className="text-[11px] font-semibold block mb-1" style={{ color:"#0A0F1A" }}>Emirate</label>
              <select
                value={profileDraft.emirate}
                onChange={(e) => setProfileDraft((p) => ({ ...p, emirate: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2"
                style={{ borderColor:"#DCE4ED" }}>
                {["Dubai","Abu Dhabi","Sharjah","Ajman","Ras Al Khaimah","Fujairah","Umm Al Quwain"].map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
              <label className="text-[11px] font-semibold block mb-1" style={{ color:"#0A0F1A" }}>Years of experience</label>
              <input type="number" min="0" value={profileDraft.experience}
                onChange={(e) => setProfileDraft((p) => ({ ...p, experience: e.target.value }))}
                placeholder="e.g. 5"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2"
                style={{ borderColor:"#DCE4ED" }}/>
              <label className="text-[11px] font-semibold block mb-1" style={{ color:"#0A0F1A" }}>Languages (comma separated)</label>
              <input value={profileDraft.languages}
                onChange={(e) => setProfileDraft((p) => ({ ...p, languages: e.target.value }))}
                placeholder="e.g. English, Arabic, Hindi"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-3"
                style={{ borderColor:"#DCE4ED" }}/>
              <button onClick={saveCandidateProfile} disabled={!profileDraft.category || savingProfile}
                className="w-full text-sm font-bold py-2.5 rounded-xl"
                style={{ background: profileDraft.category ? "linear-gradient(135deg,#0E2A44,#163A5C)" : "#DCE4ED", color:"#fff" }}>
                {savingProfile ? "Saving…" : "Save & see my matches"}
              </button>
            </div>
          ) : matches.length === 0 ? (
            <div className="text-center py-10 text-sm" style={{ color:"#7B8AA0" }}>
              No strong matches right now for {candidateProfile.category} in {candidateProfile.emirate} — check back as new listings come in, or browse "All".
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs" style={{ color:"#7B8AA0" }}>
                  Matched against your profile: <b style={{ color:"#0A0F1A" }}>{candidateProfile.category}</b> · {candidateProfile.emirate}
                </div>
                <button onClick={() => setCandidateProfile(null)} className="text-[11px] font-semibold" style={{ color:"#0E2A44" }}>Edit</button>
              </div>
              {matches.map(({ job, score, reasons }) => (
                <div key={job.id} className="mb-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background:"#FF5A3618", color:"#FF5A36" }}>
                      {score}% match
                    </span>
                    <span className="text-[10px]" style={{ color:"#7B8AA0" }}>{reasons.join(" · ")}</span>
                  </div>
                  <JobCard item={job} onApply={setApplyModal} onContact={()=>{}}/>
                </div>
              ))}
            </>
          )}
        </div>
      ) : jobView === "reels" ? (
        <div className="flex-1" style={{ minHeight: 0 }}>
          <WorkReels
            items={[
              ...filtered.map((item) => ({ ...item, kind: item.type })),
              ...(services || []).map((s) => ({ ...s, kind: "service" })),
            ]}
            onChat={() => {}}
            onApply={setApplyModal}
            emptyLabel="No reels in this filter yet."
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-4 pb-24">
          {filtered.length===0 ? (
            <div className="text-center py-10 text-sm" style={{ color:"#7B8AA0" }}>
              No listings in this category yet.
            </div>
          ) : filtered.map(item=>(
            <JobCard key={item.id} item={item}
              onApply={setApplyModal}
              onContact={()=>{}}/>
          ))}
        </div>
      )}

      {/* Apply modal */}
      {applyModal && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center"
          style={{ background:"rgba(0,0,0,.5)" }}>
          <div className="w-full sm:w-[440px] sm:rounded-2xl rounded-t-2xl p-5"
            style={{ background:"#fff" }}>
            <div className="flex items-center justify-between mb-3">
              <div style={{ fontFamily:"'Space Grotesk',sans-serif", color:"#0A0F1A" }}
                className="font-bold text-base">
                {applyModal.type==="job" ? `Apply for ${applyModal.title}` : `Hire ${applyModal.name}`}
              </div>
              <button onClick={()=>setApplyModal(null)}><X size={16} style={{ color:"#7B8AA0" }}/></button>
            </div>
            <div className="p-3 rounded-xl text-xs mb-3 flex items-start gap-2"
              style={{ background:"#1F7A4D12", color:"#1F7A4D", border:"1px solid #1F7A4D33" }}>
              <HandCoins size={13} className="shrink-0 mt-0.5"/>
              {applyModal.type==="job"
                ? "Applying is completely free. Junction will never ask you to pay a fee."
                : "Hiring through Junction means one month salary fee to us — only after successful placement."}
            </div>
            <textarea placeholder="Write a short introduction or message…" rows={4}
              className="w-full text-sm px-3 py-2.5 rounded-xl border outline-none resize-none mb-3"
              style={{ borderColor:"#DCE4ED" }}/>
            <button onClick={()=>setApplyModal(null)}
              className="w-full text-sm font-bold py-3 rounded-xl"
              style={{ background:"linear-gradient(135deg,#0E2A44,#163A5C)", color:"#fff" }}>
              {applyModal.type==="job" ? "Send application" : "Send hiring request"}
            </button>
            <p className="text-[10px] text-center mt-2" style={{ color:"#7B8AA0" }}>
              Your verified Junction identity is attached automatically. No CV upload required.
            </p>
          </div>
        </div>
      )}

      {showPost && (
        <PostJobModal
          onClose={()=>setShowPost(false)}
          verifyStatuses={verifyStatuses}
          onPublish={(item)=>{ setJobs(prev=>[item,...prev]); setShowPost(false); }}/>
      )}
    </div>
  );
}

function SettingsView({ settings, setSettings }) {
  const update = (k, v) => setSettings((s) => ({ ...s, [k]: v }));

  const Row = ({ icon: Icon, title, sub, children }) => (
    <div className="flex items-center justify-between gap-3 p-4 rounded-xl border" style={{ borderColor: T.line, background: "#fff" }}>
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: T.paper }}>
          <Icon size={16} style={{ color: T.navy }} />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-medium" style={{ color: T.ink }}>{title}</div>
          {sub && <div className="text-xs mt-0.5" style={{ color: T.sub }}>{sub}</div>}
        </div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );

  const Toggle = ({ on, onClick }) => (
    <button
      onClick={onClick}
      className="rounded-full relative shrink-0"
      style={{ width: 44, height: 26, background: on ? T.navy : T.line, transition: "background 0.2s" }}
    >
      <span
        className="absolute rounded-full bg-white shadow"
        style={{ width: 20, height: 20, top: 3, left: on ? 21 : 3, transition: "left 0.2s" }}
      />
    </button>
  );

  return (
    <div className="p-4 md:p-6 max-w-xl">
      <h1 style={{fontFamily:"'Space Grotesk',sans-serif",color:T.ink}} className="text-2xl font-semibold mb-1">
        Citizen Settings
      </h1>
      <p className="text-sm mb-5" style={{ color: T.sub }}>
        Personalize how Junction looks and notifies you.
      </p>

      <div className="flex flex-col gap-3">
        <Row icon={Moon} title="Theme" sub="Light or dark appearance">
          <div className="flex gap-1 rounded-full p-1" style={{ background: T.paper }}>
            {["light", "dark"].map((t) => (
              <button
                key={t}
                onClick={() => update("theme", t)}
                className="text-xs font-semibold px-3 py-1 rounded-full capitalize"
                style={{
                  background: settings.theme === t ? T.navy : "transparent",
                  color: settings.theme === t ? "#fff" : T.sub,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </Row>

        <Row icon={Bell} title="Notifications" sub="New messages, replies, and listing activity">
          <Toggle on={settings.notifications} onClick={() => update("notifications", !settings.notifications)} />
        </Row>

        <Row icon={Type} title="Text size" sub="Adjust reading comfort across the app">
          <div className="flex gap-1 rounded-full p-1" style={{ background: T.paper }}>
            {["sm", "md", "lg"].map((sz) => (
              <button
                key={sz}
                onClick={() => update("textSize", sz)}
                className="text-xs font-semibold px-2.5 py-1 rounded-full uppercase"
                style={{
                  background: settings.textSize === sz ? T.navy : "transparent",
                  color: settings.textSize === sz ? "#fff" : T.sub,
                }}
              >
                {sz}
              </button>
            ))}
          </div>
        </Row>

        <Row icon={Languages} title="Language" sub="Junction detected your device language automatically">
          <select
            value={settings.language}
            onChange={(e) => update("language", e.target.value)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-lg border outline-none"
            style={{ borderColor: T.line, color: T.ink }}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.native}</option>
            ))}
          </select>
        </Row>
      </div>

      <p className="text-[11px] mt-5" style={{ color: T.sub }}>
        Full translation of every screen into the selected language is not yet wired up in this
        prototype — Junction AI's voice and the language selector are ready, and connecting full
        UI translation is a fast follow once a backend is in place.
      </p>
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
  const [reach, setReach] = useState("uae");
  const [form, setForm] = useState({
    title: "",
    type: "Sale",
    category: "Apartment",
    price: "",
    emirate: "Dubai",
    area: "",
    beds: "",
    baths: "",
    sqft: "",
    furnished: "",
    serviceCharge: "",
    description: "",
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
      <div
        className="w-full sm:w-[480px] sm:rounded-2xl rounded-t-2xl flex flex-col"
        style={{ background: "#fff", height: "min(85vh, 600px)", minHeight: 0 }}
      >
        <div className="flex items-center justify-between p-4 border-b shrink-0" style={{ borderColor: T.line, background: "#fff" }}>
          <div style={{ fontFamily: "'Space Grotesk', sans-serif", color: T.ink }} className="text-base font-semibold">
            Post a property
          </div>
          <button onClick={onClose}><X size={18} style={{ color: T.sub }} /></button>
        </div>

        {!emiratesIdOk && (
          <div className="p-5 flex flex-col gap-3 items-center text-center overflow-y-auto">
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
          <>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto" style={{ flex: "1 1 auto", minHeight: 0 }}>
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
          </div>
          <div className="p-4 border-t shrink-0" style={{ borderColor: T.line, background: "#fff" }}>
            <button
              disabled={!listedAs}
              onClick={() => setStep(2)}
              className="w-full text-sm font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-1.5"
              style={{ background: listedAs ? T.ink : T.line, color: listedAs ? T.paper : T.sub }}
            >
              Continue <ArrowRight size={15} />
            </button>
          </div>
          </>
        )}

        {emiratesIdOk && step === 2 && (
          <>
          <div className="p-4 flex flex-col gap-3 overflow-y-auto" style={{ flex: "1 1 auto", minHeight: 0 }}>
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
            <div className="grid grid-cols-3 gap-2">
              <input placeholder="Beds" type="number" min="0" value={form.beds} onChange={(e) => update("beds", e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
              <input placeholder="Baths" type="number" min="0" value={form.baths} onChange={(e) => update("baths", e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
              <input placeholder="Sqft" type="number" min="0" value={form.sqft} onChange={(e) => update("sqft", e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select value={form.furnished} onChange={(e) => update("furnished", e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }}>
                <option value="">Furnishing</option>
                <option value="Furnished">Furnished</option>
                <option value="Unfurnished">Unfurnished</option>
                <option value="Semi-furnished">Semi-furnished</option>
              </select>
              <input placeholder="Service charge (AED/yr, optional)" value={form.serviceCharge} onChange={(e) => update("serviceCharge", e.target.value)}
                className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
            </div>
            <textarea placeholder="Description (optional) — layout, view, VAT/DLD fee notes, etc." value={form.description}
              onChange={(e) => update("description", e.target.value)} rows={3}
              className="text-sm px-3 py-2 rounded-lg border outline-none resize-none" style={{ borderColor: T.line }} />
            <div className="border-2 border-dashed rounded-lg p-4 text-center text-xs" style={{ borderColor: T.line, color: T.sub }}>
              <Upload size={16} className="mx-auto mb-1" /> Drop photos here (demo)
            </div>
          </div>
          <div className="p-4 border-t shrink-0 flex gap-2" style={{ borderColor: T.line, background: "#fff" }}>
            <button onClick={() => setStep(1)} className="text-sm font-semibold px-4 py-3 rounded-lg flex items-center gap-1.5" style={{ background: T.paper, color: T.ink }}>
              <ArrowLeft size={15} /> Back
            </button>
            <button onClick={() => setStep(3)} className="flex-1 text-sm font-semibold px-4 py-3 rounded-lg flex items-center justify-center gap-1.5" style={{ background: T.ink, color: T.paper }}>
              Review <ArrowRight size={15} />
            </button>
          </div>
          </>
        )}

        {emiratesIdOk && step === 3 && (
          <>
          <div className="p-5 flex flex-col gap-3 items-center text-center overflow-y-auto">
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

            <div className="w-full text-left">
              <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Who should this reach?</div>
              <div className="flex flex-col gap-2">
                {REACH_OPTIONS.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => setReach(r.id)}
                    className="text-left p-2.5 rounded-lg border flex items-center justify-between"
                    style={{
                      borderColor: reach === r.id ? T.navy : T.line,
                      background: reach === r.id ? T.paper : "#fff",
                    }}
                  >
                    <div>
                      <div className="text-xs font-medium" style={{ color: T.ink }}>{r.label}</div>
                      <div className="text-[10px]" style={{ color: T.sub }}>{r.sub}</div>
                    </div>
                    {reach === r.id && <CheckCircle2 size={14} style={{ color: T.navy }} />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 border-t shrink-0" style={{ borderColor: T.line, background: "#fff" }}>
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
                  beds: form.beds !== "" ? Number(form.beds) : null,
                  baths: form.baths !== "" ? Number(form.baths) : null,
                  sqft: form.sqft !== "" ? Number(form.sqft) : null,
                  furnished: form.furnished || null,
                  serviceCharge: form.serviceCharge || null,
                  description: form.description || null,
                  views: 0,
                  trending: false,
                  promoted: false,
                  visibility: listedAs === "DEVELOPER" ? "public" : "public",
                  listedAs,
                  reach,
                  isNew: true,
                  grad: ["#3A6FA0", "#1F3D5C"],
                };
                onPublish(newProperty);
              }}
              className="text-sm font-semibold px-4 py-3 rounded-lg w-full"
              style={{ background: T.ink, color: T.paper }}
            >
              Publish listing (demo)
            </button>
          </div>
          </>
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

  return `You are "Junction AI" — the AI matching engine inside Junction, a UAE real estate platform.

Your role is not a search bar. You are a matching engine. You:
1. MATCH — when a user describes what they need (budget, size, area, purpose), rank the best listings from the data below and explain WHY each one matches their specific requirement. Be specific: mention price, area, beds, sustainability score, who listed it, and any property history.
2. RECOMMEND — proactively suggest alternatives they haven't asked for if something in the data is a strong match ("You didn't ask, but this one fits your profile better because...").
3. CONNECT — if they ask about a contact's availability, answer from the contacts list.
4. LIST — if a user wants to post a property, confirm key details conversationally then tell them to tap "Open listing form".

You only use Junction's verified inventory below — you do not scrape or reference external platforms. If nothing matches, say so plainly and explain what would need to change (budget, area, type) to find a match.

Be concise, direct, and specific. Use AED for prices. Never give vague answers — always name actual listings.

JUNCTION VERIFIED LISTINGS:
${listingLines}

USER'S RECENT CONTACTS:
${contactLines}
`;
}

function AIAssistant({ properties, threads, onOpenPost, autoQuery, currentUser, onPublishDraft }) {
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

  // Draggable button position — defaults to bottom-right, persists while
  // the app is open (not saved across reloads). User can drag it anywhere.
  const [pos, setPos] = useState(() => ({
    x: typeof window !== "undefined" ? window.innerWidth - 80 : 300,
    y: typeof window !== "undefined" ? window.innerHeight - 150 : 500,
  }));
  const dragRef = useRef({ dragging: false, moved: false, startX: 0, startY: 0, origX: 0, origY: 0 });

  const clampPos = (x, y) => {
    const margin = 8;
    const size = 60;
    const maxX = window.innerWidth - size - margin;
    const maxY = window.innerHeight - size - margin;
    return { x: Math.min(Math.max(x, margin), maxX), y: Math.min(Math.max(y, margin), maxY) };
  };

  const startDrag = (clientX, clientY) => {
    dragRef.current = {
      dragging: true,
      moved: false,
      startX: clientX,
      startY: clientY,
      origX: pos.x,
      origY: pos.y,
    };
  };

  const moveDrag = (clientX, clientY) => {
    if (!dragRef.current.dragging) return;
    const dx = clientX - dragRef.current.startX;
    const dy = clientY - dragRef.current.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) dragRef.current.moved = true;
    setPos(clampPos(dragRef.current.origX + dx, dragRef.current.origY + dy));
  };

  const endDrag = () => {
    dragRef.current.dragging = false;
  };

  useEffect(() => {
    const onResize = () => setPos((p) => clampPos(p.x, p.y));
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

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

  // A pasted block of listing text looks like this: several short lines,
  // at least one with digits (price/sqft/beds). Real questions are usually
  // one or two lines of prose — this heuristic tells the two apart so we
  // only trigger the parse-and-draft flow when it's actually worth it.
  const looksLikeListingPaste = (text) => {
    const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length < 4) return false;
    const numericLines = lines.filter((l) => /\d/.test(l)).length;
    return numericLines >= 2;
  };

  const parseListingsFromText = async (text) => {
    const raw = await callJunctionAI({
      system: `You extract UAE property listing data from pasted, unstructured agent text. Return ONLY a JSON array (no prose, no markdown fences), of up to 3 listing objects. Each object: {"title": string, "area": string, "emirate": string (default "Dubai"), "type": "Sale"|"Rent", "category": string (e.g. "Villa","Apartment","Townhouse"), "price": number (AED, no commas/currency symbols), "beds": number|null, "baths": number|null, "sqft": number|null (use the largest of Plot/BUA/area if given), "furnished": string|null, "description": string (a 1-sentence summary of any remaining details like "single row", "prime location", "corner unit", etc)}. If you can't confidently find any real listings in the text, return []. Never invent data not implied by the text.`,
      messages: [{ role: "user", content: text }],
      maxTokens: 800,
    });
    const cleaned = raw.trim().replace(/^```(json)?/i, "").replace(/```$/, "").trim();
    try {
      const parsed = JSON.parse(cleaned);
      return Array.isArray(parsed) ? parsed.slice(0, 3) : [];
    } catch {
      return [];
    }
  };

  const confirmDraft = async (msgIndex, draft) => {
    setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, status: "posting" } : m)));
    const newProperty = {
      id: `p${Date.now()}-${msgIndex}`,
      title: draft.title || "Untitled listing",
      type: draft.type || "Sale",
      category: draft.category || "Apartment",
      price: Number(draft.price) || 0,
      priceFreq: draft.type === "Rent" ? "yr" : undefined,
      area: draft.area || "—",
      emirate: draft.emirate || "Dubai",
      beds: draft.beds ?? null,
      baths: draft.baths ?? null,
      sqft: draft.sqft ?? null,
      furnished: draft.furnished || null,
      description: draft.description || null,
      views: 0,
      trending: false,
      promoted: false,
      visibility: "public",
      isNew: true,
      grad: ["#3A6FA0", "#1F3D5C"],
    };
    const result = await onPublishDraft(newProperty);
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIndex ? { ...m, status: result.success ? "posted" : "failed", error: result.error } : m
      )
    );
  };

  const discardDraft = (msgIndex) => {
    setMessages((prev) => prev.map((m, i) => (i === msgIndex ? { ...m, status: "discarded" } : m)));
  };

  const send = async (text) => {
    const content = (text ?? input).trim();
    if (!content || loading) return;
    const next = [...messages, { role: "user", text: content }];
    setMessages(next);
    setInput("");
    setLoading(true);

    // Paste-a-listing → AI drafts it, user just reviews and confirms.
    if (looksLikeListingPaste(content)) {
      try {
        const drafts = await parseListingsFromText(content);
        if (drafts.length > 0) {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: `Found ${drafts.length} listing${drafts.length > 1 ? "s" : ""} — review and confirm below.` },
            ...drafts.map((d) => ({ role: "assistant", type: "draft", draft: d, status: "pending" })),
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            { role: "assistant", text: "That looked like it might be a listing, but I couldn't confidently pull structured details from it — want to try the manual post form instead?" },
          ]);
        }
      } catch (e) {
        setMessages((prev) => [...prev, { role: "assistant", text: `I couldn't parse that — ${e.message}` }]);
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      const text2 = await callJunctionAI({
        system: buildAssistantContext(properties, threads),
        messages: next.map((m) => ({ role: m.role, content: m.text })),
        maxTokens: 1000,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: text2 || "Sorry, I couldn't find an answer to that." },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: `I'm having trouble connecting right now — ${e.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  // Voice input — uses the browser's built-in speech recognition, no
  // external service needed. Not supported in every browser (Chrome/Edge
  // yes, Firefox no) — the mic button just won't appear where it's missing.
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const toggleVoiceInput = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "en-US";
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    rec.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      send(transcript);
    };
    recognitionRef.current = rec;
    rec.start();
  };

  return (
    <>
      {/* Floating button — draggable, move it anywhere on screen */}
      <button
        id="j-ai-btn"
      onClick={() => {
          if (!dragRef.current.moved) setOpen((o) => !o);
        }}
        onMouseDown={(e) => startDrag(e.clientX, e.clientY)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          startDrag(t.clientX, t.clientY);
        }}
        onMouseMove={(e) => {
          if (e.buttons === 1) moveDrag(e.clientX, e.clientY);
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          moveDrag(t.clientX, t.clientY);
        }}
        onMouseUp={endDrag}
        onTouchEnd={endDrag}
        onMouseLeave={endDrag}
        className="fixed z-40 flex items-center justify-center rounded-full shadow-lg"
        style={{
          left: `${pos.x}px`,
          top: `${pos.y}px`,
          width: "60px",
          height: "60px",
          background: "linear-gradient(135deg, #006EFF, #00CFFF)",
          boxShadow: "0 0 20px rgba(0,207,255,0.5), 0 4px 16px rgba(0,0,0,.3)",
          touchAction: "none",
          cursor: "grab",
        }}
      >
        <JunctionLogoMark size={30} glow />
      </button>

      {/* Panel — always docks to a reliable spot regardless of button position */}
      {open && (
        <div
          className="fixed z-40 flex flex-col rounded-2xl shadow-2xl overflow-hidden"
          style={{
            right: "16px",
            left: "16px",
            bottom: "16px",
            maxWidth: "380px",
            marginLeft: "auto",
            marginRight: "auto",
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
            {messages.map((m, i) => {
              if (m.type === "draft") {
                const d = m.draft;
                return (
                  <div key={i} className="max-w-[92%] self-start rounded-xl p-3"
                    style={{ background: "#0A1E30", border: "1px solid #00CFFF33" }}>
                    <div className="text-xs font-bold mb-1" style={{ color: "#00CFFF" }}>DRAFT — review before posting</div>
                    <div className="text-sm font-semibold mb-1" style={{ color: "#EAF3F7" }}>{d.title}</div>
                    <div className="text-xs mb-2" style={{ color: "#8FB3CC" }}>
                      {d.area}, {d.emirate} · {d.category} · {d.type}
                      {d.beds != null ? ` · ${d.beds} bed` : ""}{d.baths != null ? ` · ${d.baths} bath` : ""}
                      {d.sqft != null ? ` · ${d.sqft} sqft` : ""}{d.furnished ? ` · ${d.furnished}` : ""}
                    </div>
                    <div className="text-sm font-bold mb-2" style={{ color: "#00CFFF" }}>
                      AED {Number(d.price || 0).toLocaleString()}{d.type === "Rent" ? "/yr" : ""}
                    </div>
                    {d.description && <div className="text-xs mb-2" style={{ color: "#B8EEFF" }}>{d.description}</div>}

                    {m.status === "pending" && (
                      <div className="flex gap-2 mt-1">
                        <button onClick={() => confirmDraft(i, d)}
                          className="flex-1 text-xs font-semibold py-2 rounded-lg"
                          style={{ background: "linear-gradient(135deg,#00CFFF,#5B9EFF)", color: "#04111F" }}>
                          Confirm &amp; Post
                        </button>
                        <button onClick={() => discardDraft(i)}
                          className="text-xs font-semibold py-2 px-3 rounded-lg"
                          style={{ background: "transparent", color: "#8FB3CC", border: "1px solid #00CFFF33" }}>
                          Discard
                        </button>
                      </div>
                    )}
                    {m.status === "posting" && (
                      <div className="text-xs flex items-center gap-1.5" style={{ color: "#8FB3CC" }}>
                        <Loader2 size={12} className="animate-spin" /> Posting…
                      </div>
                    )}
                    {m.status === "posted" && (
                      <div className="text-xs font-semibold" style={{ color: "#2DBD8A" }}>✓ Posted to the feed</div>
                    )}
                    {m.status === "failed" && (
                      <div className="text-xs font-semibold" style={{ color: "#E0554C" }}>Didn't save — {m.error}</div>
                    )}
                    {m.status === "discarded" && (
                      <div className="text-xs" style={{ color: "#5A7A8A" }}>Discarded</div>
                    )}
                  </div>
                );
              }
              return (
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
              );
            })}
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
              placeholder={listening ? "Listening…" : "Ask Junction AI, or paste a listing…"}
              className="flex-1 text-sm px-3 py-2 rounded-xl border outline-none"
              style={{ borderColor: "#00CFFF22", background: "#0A1E30", color: "#B8EEFF",
                fontFamily: "'IBM Plex Mono',monospace" }}
            />
            {speechSupported && (
              <button
                onClick={toggleVoiceInput}
                title={listening ? "Stop listening" : "Speak to Junction AI"}
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: listening ? "#E0554C" : "#0A1E30", border: "1px solid #00CFFF33" }}
              >
                <Mic size={15} color={listening ? "#fff" : "#00CFFF"} />
              </button>
            )}
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

// ---------------------------------------------------------------
// JUNCTION CIRCLES — first-pass demo of nationality/area community
// groups. Mock data only for now; real version would tie into actual
// verified user counts and the main Service/Business/Property feeds.
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// NEIGHBORHOODS — Dubai's master-planned real estate communities.
// Distinct from Community Circles (nationality groups) above — this is
// about the physical communities themselves: who built them, and what's
// actually inside. Two are researched in real depth; the rest start with
// verified developer info only and an open "add details" contribution
// path, same spirit as the rest of Junction's trust layer.
// ---------------------------------------------------------------
const NEIGHBORHOODS = [
  {
    id: "deira",
    totalMembers: 12400, publicN: 8680, privateN: 3720,
    name: "Deira",
    developer: "Dubai Municipality / Government of Dubai (historic district — not a single master developer)",
    area: "Old Dubai, northern bank of Dubai Creek",
    sizeText: "One of Dubai's oldest districts · population ~400,000 · dates to the 1700s",
    verified: true,
    subCommunities: ["Al Rigga", "Al Muraqqabat", "Naif", "Hor Al Anz", "Abu Hail", "Al Baraha", "Port Saeed", "Al Muteena"],
    amenities: {
      schools: ["Deira International School (UK/IB, to Year 13)", "Deira Private School (British, to Year 6)", "Al Ittihad Private School", "Al-Amin Private School"],
      mosques: ["Omar Ali Bin Haider Mosque (built 1952, capacity 1,000)", "Salman Al Farsi Masjid", "Port Saeed Masjid", "Al Rigga Mosque", "Saifee Masjid"],
      churches: ["JA1 Church", "Crossroads Church Dubai (at Swissôtel Al Ghurair)"],
      malls: ["Deira City Centre (370+ stores)", "Al Ghurair Centre", "Century Mall", "Reef Mall"],
      restaurants: ["Automatic Restaurant & Grill", "Fish Hut", "Countless souk-area and heritage eateries"],
      hotels: ["Avani Deira Dubai", "Crowne Plaza Deira", "Royal Continental Hotel", "Hilton Garden Inn Al Muraqabat", "Rove City Centre"],
      banks: [],
      police: [],
      gyms: ["Fitness First (Deira City Centre)", "Power Gym", "Al Wasl Sports Club"],
      clubs: [],
      hospitals: ["Dubai Hospital (Al Baraha, government)", "Belhoul Specialty Hospital", "Canadian Specialty Hospital", "Prime Hospital"],
      parks: ["Al Mamzar Beach Park", "Al Muteena Park"],
      other: ["Gold Souk", "Spice Souk", "Dubai Creek dhow wharf & abra crossings", "Deira Clock Tower", "Al Ahmadiya School Museum (Dubai's first school, 1912)"],
    },
    note: "Unlike Dubai's newer master communities, Deira actually has functioning churches within it (JA1 Church, Crossroads Church) — Hindu temples are a short trip away in nearby Bur Dubai. This is Old Dubai: dense, historic, and genuinely mixed-faith.",
  },
  {
    id: "dubai-hills-estate",
    totalMembers: 8500, publicN: 5950, privateN: 2550,
    name: "Dubai Hills Estate",
    developer: "Emaar Properties (JV with Meraas)",
    area: "Mohammed Bin Rashid City",
    sizeText: "2,700 acres · ~20 sub-communities · capacity 150,000+ residents",
    verified: true,
    subCommunities: ["Maple", "Sidra Villas", "Park Heights", "Golf Place", "Fairway Vistas",
      "Majestic Vistas", "Parkway Vistas", "Emerald Hills", "Collective", "Acacia"],
    amenities: {
      schools: ["GEMS International School", "GEMS Wellington Academy", "GEMS New Millennium School"],
      mosques: ["Dubai Hills Mosque (community mosque, opening soon)"],
      churches: [],
      malls: ["Dubai Hills Mall (650+ retail & dining outlets)"],
      restaurants: ["Dozens inside Dubai Hills Mall — not yet catalogued individually"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Dubai Hills Golf Club fitness facilities", "Community park fitness stations"],
      clubs: ["Dubai Hills Golf Club"],
      hospitals: ["King's College Hospital London Dubai", "American Hospital Dubai Hills Clinic"],
      parks: ["Dubai Hills Park (one of Dubai's largest residential parks)"],
      other: ["18-hole championship golf course (Dubai Hills Golf Club)", "Blossom Nursery (2 branches)"],
    },
    note: "No church operating inside the community yet — nearest is roughly 20 minutes away. The community mosque is still completing construction; residents currently use nearby mosques in Al Quoz / Al Barsha.",
  },
  {
    id: "damac-hills",
    totalMembers: 6200, publicN: 4340, privateN: 1860,
    name: "Damac Hills",
    developer: "DAMAC Properties",
    area: "Dubailand",
    sizeText: "42 million sq ft · 3,000+ villas & townhouses, 5,000+ apartments",
    verified: true,
    subCommunities: ["Akoya Drive", "Akoya Park", "Golf Town", "Artesia", "The Park Villas", "Silver Springs"],
    amenities: {
      schools: ["Jebel Ali School (British curriculum, on-site)"],
      mosques: ["Mosque in Silver Springs", "2 additional Jumaa mosques completed 2025"],
      churches: [],
      malls: ["DAMAC Mall (40 retail outlets, 10 restaurants)"],
      restaurants: ["Restaurants inside DAMAC Mall — not yet catalogued individually"],
      hotels: ["Radisson Dubai Damac Hills"],
      banks: [],
      police: [],
      gyms: ["Trump International Golf Club clubhouse fitness facilities"],
      clubs: ["Trump International Golf Club Dubai"],
      hospitals: ["Saudi German Clinic (Artesia Tower B)"],
      parks: ["Damac Hills Park / Akoya Park (4 million sq ft of green space)"],
      other: ["Trump International Golf Club Dubai (18-hole)", "CreaKids Nursery"],
    },
    note: "No church operating inside the community — nearest options (United Christian Church of Dubai, St. Francis of Assisi) are about 20 minutes away in Jebel Ali Village.",
  },
  {
    id: "arabian-ranches",
    totalMembers: 5100, publicN: 3570, privateN: 1530,
    name: "Arabian Ranches",
    developer: "Emaar Properties",
    area: "Dubailand",
    sizeText: "One of Dubai's original villa communities, opened 2004 · 4,000+ villas & townhouses across ~15 sub-communities",
    verified: true,
    subCommunities: ["Alvorada", "Savannah", "Mirador", "Mirador La Coleccion", "Terra Nova", "Al Reem", "Palmera", "Saheel", "La Avenida", "Casa"],
    amenities: {
      schools: ["Jumeirah English Speaking School (JESS) Arabian Ranches", "Ranches Primary School", "GEMS Metropole School (nearby)"],
      mosques: ["Arabian Ranches Community Mosque (Ranches Souk)"],
      churches: [],
      malls: ["Arabian Ranches Souk (community retail centre)"],
      restaurants: ["Restaurants and cafés within the Ranches Souk"],
      hotels: [],
      banks: ["Emirates NBD ATM/branch at the Souk"],
      police: [],
      gyms: ["Dubai Polo & Equestrian Club fitness facilities", "Arabian Ranches Golf Club fitness centre"],
      clubs: ["Arabian Ranches Golf Club", "Dubai Polo & Equestrian Club"],
      hospitals: ["Mediclinic clinic at the Souk (routine care)"],
      parks: ["Multiple community parks and jogging tracks throughout the villa clusters"],
      other: ["Arabian Ranches Golf Club (18-hole, Ian Baker-Finch design)", "Dubai Polo & Equestrian Club (polo, riding lessons)"],
    },
    note: "No church on-site — nearest options are in Jebel Ali Village, about 20–25 minutes away. Very family-oriented, low-rise villa living; most day-to-day life happens at the Ranches Souk.",
  },
  {
    id: "town-square",
    totalMembers: 4300, publicN: 3010, privateN: 1290,
    name: "Town Square",
    developer: "Nshama",
    area: "Al Yalayis, Dubailand",
    sizeText: "Master community · 750+ acres · mix of townhouses and apartments (Zahra, Hayat, Safi, Nseej clusters)",
    verified: true,
    subCommunities: ["Zahra Townhouses", "Hayat Townhouses", "Safi Townhouses", "Nseej Townhouses", "The Central Park apartments"],
    amenities: {
      schools: ["Nurseries within the community; primary/secondary options are a drive away in Damac Hills / Motor City"],
      mosques: ["Town Square Community Mosque"],
      churches: [],
      malls: ["Town Square Park retail strip (cafés, supermarket, services)"],
      restaurants: ["Casual dining and cafés along the Town Square Park promenade"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Outdoor fitness stations in Town Square Park"],
      clubs: [],
      hospitals: ["Community clinic within Town Square Park"],
      parks: ["Town Square Park (the development's central 74-acre park, skate park, splash pad, running track)"],
      other: ["Kids' splash pad and skate park", "Cycling and jogging tracks throughout"],
    },
    note: "Budget-friendly, family-oriented community built around its large central park. No church on-site; nearest options are 20+ minutes away.",
  },
  {
    id: "jumeirah-village-circle",
    totalMembers: 7800, publicN: 5460, privateN: 2340,
    name: "Jumeirah Village Circle (JVC)",
    developer: "Nakheel",
    area: "Al Barsha South",
    sizeText: "560+ hectares · organized into ~33 numbered districts of villas, townhouses and mid-rise apartment buildings",
    verified: true,
    subCommunities: ["District 10", "District 11", "District 12", "District 13", "District 14", "District 15", "Circle Mall area"],
    amenities: {
      schools: ["JSS International School", "Bright Riders School", "Sunmarke School"],
      mosques: ["Several district-level mosques throughout JVC"],
      churches: [],
      malls: ["Circle Mall JVC", "Numerous ground-floor retail strips within individual buildings"],
      restaurants: ["Wide mix of casual restaurants and cafés spread across the community's many towers"],
      hotels: ["Fortune Plaza / district hotel-apartments"],
      banks: ["Emirates NBD, Mashreq branches within Circle Mall"],
      police: [],
      gyms: ["Most residential towers have in-building gyms; Fitness First and independent gyms in retail strips"],
      clubs: [],
      hospitals: ["Aster Clinic", "Medicentres JVC", "Prime Medical Center"],
      parks: ["JVC District Park", "Several smaller community parks scattered across districts"],
      other: ["One of Dubai's most budget-friendly freehold areas — dense with small independent shops and cafés"],
    },
    note: "One of Dubai's fastest-growing and most affordable freehold communities — new towers are still being delivered, so amenities vary noticeably district to district.",
  },
  {
    id: "jumeirah-golf-estates",
    totalMembers: 2100, publicN: 1470, privateN: 630,
    name: "Jumeirah Golf Estates",
    developer: "Nakheel",
    area: "Dubailand",
    sizeText: "1,119 hectares · two championship golf courses (Fire & Earth), villas and apartment clusters around the fairways",
    verified: true,
    subCommunities: ["Redwood Park", "Alandalus", "Flora", "Hillside", "Frond", "Al Andalus"],
    amenities: {
      schools: [],
      mosques: ["Community mosque near the clubhouse"],
      churches: [],
      malls: ["The Retail Centre, Jumeirah Golf Estates"],
      restaurants: ["Clubhouse dining at Earth and Fire courses"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Clubhouse fitness facilities"],
      clubs: ["European Tour Performance Institute", "Jumeirah Golf Estates clubhouse"],
      hospitals: [],
      parks: ["Landscaped walking trails along the fairways"],
      other: ["Home of the DP World Tour Championship", "Earth Course and Fire Course (both 18-hole championship layouts)"],
    },
    note: "Golf-first community — schools and hospitals are a drive away in Dubai Sports City / Motor City. Best known as host of the European Tour's season finale.",
  },
  {
    id: "emirates-living",
    totalMembers: 5600, publicN: 3919, privateN: 1680,
    name: "Emirates Living (Springs, Meadows, Lakes)",
    developer: "Emaar Properties",
    area: "New Dubai, near Dubai Marina",
    sizeText: "One of Dubai's earliest master villa communities · Springs (15 sub-clusters), Meadows (9 sub-clusters), Lakes (13 towers/clusters)",
    verified: true,
    subCommunities: ["The Springs 1–15", "The Meadows 1–9", "The Lakes"],
    amenities: {
      schools: ["Emirates International School Meadows", "Dubai British School (Springs 3)", "Regent International School"],
      mosques: ["Springs Community Mosque"],
      churches: [],
      malls: ["Springs Souk", "The Lakes community centre"],
      restaurants: ["Restaurants and cafés within Springs Souk"],
      hotels: [],
      banks: ["Emirates NBD branch at Springs Souk"],
      police: [],
      gyms: ["Fitness First Springs Souk"],
      clubs: ["Els Club (adjacent golf course, Montgomerie Dubai nearby)"],
      hospitals: ["Mediclinic Meadows"],
      parks: ["Numerous lakeside parks and jogging tracks throughout Springs, Meadows and Lakes"],
      other: ["Man-made lakes and canal-style waterways running through Meadows and Lakes"],
    },
    note: "One of Dubai's original 'old guard' villa communities from the early 2000s — mature landscaping and an established, family-heavy resident base. No church on-site.",
  },
  {
    id: "downtown-dubai",
    totalMembers: 9200, publicN: 6440, privateN: 2760,
    name: "Downtown Dubai",
    developer: "Emaar Properties",
    area: "Central Dubai",
    sizeText: "Emaar's flagship 500-acre district · home to Burj Khalifa (828m) and The Dubai Mall",
    verified: true,
    subCommunities: ["The Residences", "Old Town", "Burj Vista", "South Ridge", "Boulevard Point", "The Address towers"],
    amenities: {
      schools: ["No schools inside the district itself — nearest are Citizens School (City Walk), GEMS Jumeirah Primary (Al Safa) and Dubai British School (Emirates Hills), all a short drive away"],
      mosques: ["Sheikha Abdullah Salem Mosque", "Al Ghafoor Mosque (Mohammed Bin Rashid Boulevard)", "Prayer rooms inside The Dubai Mall"],
      churches: [],
      malls: ["The Dubai Mall (1,000+ stores, aquarium, ice rink)", "Souk Al Bahar"],
      restaurants: ["Dense concentration of fine-dining and skyline-view restaurants around the Fountain and Boulevard"],
      hotels: ["Armani Hotel Dubai (in Burj Khalifa)", "Address Downtown", "Address Boulevard", "The St. Regis Downtown", "Vida Downtown"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across Residences, South Ridge and Burj Vista towers"],
      clubs: [],
      hospitals: ["Mediclinic Dubai Mall", "Emirates Hospital Clinic", "Medeor Downtown Medical Centre", "Valiant Clinic & Hospital"],
      parks: ["Burj Park"],
      other: ["Burj Khalifa observation decks", "The Dubai Fountain", "Dubai Opera"],
    },
    note: "No schools or churches within Downtown's own boundaries — families lean on nearby Business Bay, Al Safa and City Walk. Nearest churches (St. Mary's Catholic, Holy Trinity) are about 15 minutes away in Oud Mehta; Hindu temples in Bur Dubai are about 20 minutes.",
  },
  {
    id: "dubai-marina",
    totalMembers: 8800, publicN: 6160, privateN: 2640,
    name: "Dubai Marina",
    developer: "Emaar Properties",
    area: "New Dubai, coastal",
    sizeText: "3.5km man-made marina canal · 200+ residential towers · ~55,000 residents",
    verified: true,
    subCommunities: ["Marina Promenade", "Marina Walk", "Al Sahab", "Marina Diamonds", "Marina Gate", "Cayan Tower area"],
    amenities: {
      schools: ["No schools directly within the Marina — closest are Emirates International School Meadows and Regent International School (The Greens), a short drive away"],
      mosques: ["Masjid Al Rahim (opened 2013, capacity 2,000)", "Mohammed Bin Ahmed Almulla Mosque (opened 2016)"],
      churches: [],
      malls: ["Dubai Marina Mall (140+ stores, Reel Cinemas)"],
      restaurants: ["Pier 7 (7 floors of restaurants)", "Marina Walk dining strip", "District 8"],
      hotels: ["Address Dubai Marina", "Grosvenor House", "Le Royal Meridien Beach Resort", "InterContinental Dubai Marina", "Rove Dubai Marina"],
      banks: [],
      police: [],
      gyms: ["Fitness First Marina Gate", "NRG Fitness Marina Walk", "F45 Trident Grande Mall", "Barry's Bootcamp"],
      clubs: ["Dubai Marina Yacht Club"],
      hospitals: ["Emirates Hospital Clinic", "King's Marina Medical Centre", "Medcare Medical Centre"],
      parks: [],
      other: ["XLine Dubai Marina (world's longest urban zipline)", "Skydive Dubai drop zone views", "7km Marina Walk promenade"],
    },
    note: "No church directly on-site — nearest options (St. Francis of Assisi, United Christian Church of Dubai) are about 15 minutes away in Jebel Ali. Very dense, high-rise, and geared toward young professionals and couples more than families.",
  },
  {
    id: "palm-jumeirah",
    totalMembers: 4700, publicN: 3290, privateN: 1410,
    name: "Palm Jumeirah",
    developer: "Nakheel",
    area: "Arabian Gulf coastline",
    sizeText: "Man-made palm-shaped island, first residents 2007 · ~80,000 residents across the Trunk (apartments) and 16 Fronds (villas)",
    verified: true,
    subCommunities: ["The Trunk", "Shoreline Apartments", "Golden Mile", "Garden Homes (Fronds)", "Signature Villas (Fronds)"],
    amenities: {
      schools: ["Jumeirah International Nurseries (JINS)", "Blossom Nursery Palm Jumeirah — primary/secondary schools are off-island"],
      mosques: ["Abdul Rahman Siddik Mosque (on the Trunk)"],
      churches: [],
      malls: ["Palm Jumeirah Mall (formerly Nakheel Mall)", "Golden Mile Galleria"],
      restaurants: ["Il Ristorante – Niko Romito (Bulgari Resort, 2 Michelin stars)", "Extensive dining at Atlantis The Palm and The Pointe"],
      hotels: ["Atlantis The Palm", "One&Only The Palm", "Waldorf Astoria", "Hilton Dubai Palm Jumeirah", "FIVE Palm Jumeirah"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across Shoreline and Trunk towers"],
      clubs: [],
      hospitals: ["Medcare Medical Centre (Seven Palm)", "Dubai London Clinic (Nakheel Mall)", "Al Das Medical Clinic (Shoreline Apartments)"],
      parks: [],
      other: ["Palm Monorail (Gateway to Atlantis)", "The Pointe waterfront dining & fountain show", "Private beach access on Frond villas"],
    },
    note: "No church on the island — nearest options are on the mainland, about 20 minutes away. One of Dubai's most prestigious and expensive addresses, fully freehold and open to all nationalities.",
  },
  {
    id: "business-bay",
    totalMembers: 6100, publicN: 4270, privateN: 1830,
    name: "Business Bay",
    developer: "Dubai Properties (multiple sub-developers)",
    area: "Central Dubai, next to Downtown",
    sizeText: "Central mixed-use district along the Dubai Water Canal, fronting Sheikh Zayed Road",
    verified: true,
    subCommunities: ["Executive Towers", "Bay Square", "The Opus district", "Marasi Business Bay (canal-front)"],
    amenities: {
      schools: ["No schools within Business Bay itself — JESS and GEMS Jumeirah Primary (Al Safa) are the nearest, a short drive away"],
      mosques: ["Bay Avenue Mosque", "Community mosques within several residential clusters"],
      churches: [],
      malls: ["Bay Avenue Mall (Executive Towers)"],
      restaurants: ["Wide mix of casual and international dining along the Dubai Water Canal boardwalk"],
      hotels: ["The Oberoi Dubai", "Taj Dubai", "Radisson Blu Business Bay"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across most residential towers"],
      clubs: [],
      hospitals: ["Emirates Hospital Clinic (adjacent areas)", "Pharmacies and clinics throughout the district"],
      parks: [],
      other: ["Dubai Water Canal boardwalk (cycling and running track)", "Direct canal views from most towers"],
    },
    note: "Dense, commercial-first district right next to Downtown — great connectivity but limited schools/churches on-site, similar profile to Downtown itself.",
  },
  {
    id: "jbr",
    totalMembers: 5200, publicN: 3640, privateN: 1560,
    name: "Jumeirah Beach Residence (JBR)",
    developer: "Dubai Properties",
    area: "New Dubai, beachfront",
    sizeText: "1.7km beachfront strip · ~40 towers (35 residential, 5 hotel), 6,900+ apartments across 6 clusters",
    verified: true,
    subCommunities: ["Sadaf", "Amwaj", "Rimal", "Bahar", "Shams", "Murjan"],
    amenities: {
      schools: ["No schools directly in JBR — GEMS Wellington International (Al Sufouh) and Dubai British School (Jumeirah Park) are a 15–20 min drive"],
      mosques: ["Musabeh Al Fattan Mosque", "Al-Rahim Mosque", "At least one mosque per residential cluster"],
      churches: [],
      malls: ["The Walk at JBR (1.7km retail promenade)", "The Beach at JBR"],
      restaurants: ["The Maine Oyster Bar & Grill", "Extensive dining along The Walk and The Beach"],
      hotels: ["Sofitel Dubai Jumeirah Beach", "Amwaj Rotana", "JA Ocean View Hotel", "Mövenpick Hotel Jumeirah Beach", "Banyan Tree Dubai (Bluewaters)"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across residential clusters"],
      clubs: [],
      hospitals: ["Medcare Medical Centre JBR", "Emirates Hospitals Clinic JBR"],
      parks: [],
      other: ["Public beach — one of Dubai's most popular", "JBR Tram stations (1 & 2)", "Ain Dubai views from beachfront towers"],
    },
    note: "No church on-site — nearest is a short drive into Jebel Ali/Marina-adjacent areas. Lively, tourist-heavy beachfront strip that's also genuinely popular with young families and professionals.",
  },
  {
    id: "arabian-ranches-2",
    totalMembers: 3400, publicN: 2380, privateN: 1020,
    name: "Arabian Ranches II",
    developer: "Emaar Properties",
    area: "Dubailand",
    sizeText: "Newer phase south of the original Ranches · townhouses and villas across ~8 sub-clusters",
    verified: true,
    subCommunities: ["Rosa", "Palma", "Camelia", "Yasmin", "Samara"],
    amenities: {
      schools: ["Ranches Primary School (shared with Ranches I, nearby)"],
      mosques: ["Community mosque within Rosa"],
      churches: [],
      malls: ["The Farm community retail centre"],
      restaurants: ["Casual dining at The Farm"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre fitness facilities"],
      clubs: [],
      hospitals: [],
      parks: ["Central community park with jogging/cycling tracks"],
      other: ["Splash pad and children's play areas"],
    },
    note: "Similar family-villa profile to the original Ranches, just newer construction. Developer confirmed; smaller retail footprint than Ranches I.",
  },
  {
    id: "arabian-ranches-3",
    totalMembers: 2800, publicN: 1960, privateN: 840,
    name: "Arabian Ranches III",
    developer: "Emaar Properties",
    area: "Dubailand",
    sizeText: "Newest phase, launched 2019 · villas and townhouses across multiple sub-clusters (Rukan, Wadi, Bliss, Farm Gardens)",
    verified: true,
    subCommunities: ["Rukan", "Wadi", "Bliss", "Farm Gardens", "Caya"],
    amenities: {
      schools: [],
      mosques: ["Community mosque planned/under construction alongside residential handovers"],
      churches: [],
      malls: ["Community retail centre (in development alongside phased handovers)"],
      restaurants: [],
      hotels: [],
      banks: [],
      police: [],
      gyms: [],
      clubs: [],
      hospitals: [],
      parks: ["Central park spine running through the community"],
      other: [],
    },
    note: "Still being delivered in phases — amenities are filling in as each sub-cluster hands over. Be the first to confirm what's actually open.",
  },
  {
    id: "the-valley",
    totalMembers: 1900, publicN: 1330, privateN: 570,
    name: "The Valley",
    developer: "Emaar Properties",
    area: "Al Ain Road, Dubailand",
    sizeText: "Newer family-villa community launched 2019, along Al Ain Road roughly midway between Dubai and the desert edge",
    verified: true,
    subCommunities: ["Eden", "Rivana", "Nara", "Talia", "Elora"],
    amenities: {
      schools: [],
      mosques: ["Community mosque within the town centre"],
      churches: [],
      malls: ["The Pavilion (town centre retail — supermarket, cafés, clinic)"],
      restaurants: ["Casual dining within The Pavilion"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre fitness areas"],
      clubs: [],
      hospitals: ["Clinic within The Pavilion"],
      parks: ["Central park spine and cycling tracks running through the community"],
      other: ["Water Park / lagoon-style amenity plots planned across phases"],
    },
    note: "Still growing — new sub-communities are handing over in phases, so schools and larger retail are still filling in. Popular with young families for the price point.",
  },
  {
    id: "dubai-creek-harbour",
    totalMembers: 3100, publicN: 2170, privateN: 930,
    name: "Dubai Creek Harbour",
    developer: "Emaar Properties",
    area: "Ras Al Khor, along Dubai Creek",
    sizeText: "550-hectare waterfront district on Dubai Creek, facing the Ras Al Khor Wildlife Sanctuary",
    verified: true,
    subCommunities: ["Creek Rise", "Harbour Views", "Harbour Gate", "The Grove", "Address Harbour Point"],
    amenities: {
      schools: ["Nurseries within the district; primary/secondary options are a drive away for now"],
      mosques: ["Creek Marina Mosque"],
      churches: [],
      malls: ["Creek Marina retail promenade"],
      restaurants: ["Waterfront dining along the Creek Marina promenade"],
      hotels: ["Vida Creek Harbour", "Address Harbour Point"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across residential towers"],
      clubs: [],
      hospitals: [],
      parks: ["Central Park (Creek Harbour's landscaped green spine)"],
      other: ["Views of Ras Al Khor Wildlife Sanctuary (flamingos)", "Future site of Dubai Creek Tower"],
    },
    note: "Still under active development — many towers are newly handed over or under construction, so amenities are expanding quickly year to year.",
  },
  {
    id: "damac-hills-2",
    totalMembers: 4100, publicN: 2870, privateN: 1230,
    name: "DAMAC Hills 2 (Akoya Oxygen)",
    developer: "DAMAC Properties",
    area: "Dubailand",
    sizeText: "55 million sq ft budget-friendly villa/townhouse community, further out toward Al Qudra",
    verified: true,
    subCommunities: ["Bermuda", "Nice", "Cordoba", "Fulton", "Malta", "Providence"],
    amenities: {
      schools: [],
      mosques: ["Community mosque near the entrance plaza"],
      churches: [],
      malls: ["Community retail plaza (supermarket, pharmacy, cafés)"],
      restaurants: ["Casual dining within the retail plaza"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre fitness facilities"],
      clubs: [],
      hospitals: ["Community clinic"],
      parks: ["Malibu Beach (community's artificial beach/wave pool amenity)"],
      other: ["Water Town aqua park", "Butterfly Garden and petting zoo (community attractions)"],
    },
    note: "One of Dubai's most affordable large-scale villa communities — trades a longer commute for space and family-focused amenities like the wave pool and aqua park.",
  },
  {
    id: "damac-lagoons",
    totalMembers: 2600, publicN: 1820, privateN: 780,
    name: "DAMAC Lagoons",
    developer: "DAMAC Properties",
    area: "Dubailand, near Damac Hills",
    sizeText: "Mediterranean-themed villa community built around a network of artificial lagoons, launched 2021",
    verified: true,
    subCommunities: ["Venice", "Santorini", "Costa Brava", "Morocco", "Portofino", "Andalusia"],
    amenities: {
      schools: [],
      mosques: ["Community mosque planned alongside phased handovers"],
      churches: [],
      malls: ["Retail plaza planned within the master community"],
      restaurants: [],
      hotels: [],
      banks: [],
      police: [],
      gyms: [],
      clubs: [],
      hospitals: [],
      parks: ["Lagoon-front walkways and beaches across the various themed clusters"],
      other: ["Crystal-lagoon-style turquoise waters", "Floating amphitheatre and water-themed attractions (in development)"],
    },
    note: "Still being delivered in phases across its Mediterranean-themed clusters — amenities are filling in as each village hands over. Be the first to confirm what's actually open.",
  },
  {
    id: "city-walk",
    totalMembers: 2200, publicN: 1540, privateN: 660,
    name: "City Walk",
    developer: "Meraas",
    area: "Al Wasl, near Downtown",
    sizeText: "Urban lifestyle district — low-rise residential blocks above an open-air retail boulevard",
    verified: true,
    subCommunities: ["City Walk Residences", "The Central Park at City Walk"],
    amenities: {
      schools: ["Citizens School (on-site, British/IB curriculum)"],
      mosques: ["Prayer facilities within the retail boulevard"],
      churches: [],
      malls: ["City Walk open-air retail boulevard", "Includes Coca-Cola Arena"],
      restaurants: ["Extensive high-end and casual dining along the pedestrian boulevard"],
      hotels: ["The St. Regis Dubai, Al Habtoor City (nearby)"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across the residential blocks"],
      clubs: [],
      hospitals: ["Mediclinic City Walk"],
      parks: ["Central Park at City Walk"],
      other: ["Coca-Cola Arena (concerts/events)", "Green Planet indoor rainforest"],
    },
    note: "Walkable, boutique urban district right next to Jumeirah and a short drive from Downtown — genuinely has a school and hospital on-site, which is rare this close to the city centre.",
  },
  {
    id: "bluewaters-island",
    totalMembers: 1700, publicN: 1190, privateN: 510,
    name: "Bluewaters Island",
    developer: "Meraas",
    area: "Off Jumeirah Beach Residence",
    sizeText: "Man-made island connected to JBR by pedestrian bridge · home to Ain Dubai, the world's tallest observation wheel",
    verified: true,
    subCommunities: ["Bluewaters Residences (5 towers)"],
    amenities: {
      schools: [],
      mosques: ["Prayer facilities within the island's retail promenade"],
      churches: [],
      malls: ["The Wharf (ground-level retail promenade circling the island)"],
      restaurants: ["Wide mix of dining along The Wharf, many with Ain Dubai views"],
      hotels: ["Caesars Palace Bluewaters Dubai", "Banyan Tree Dubai"],
      banks: [],
      police: [],
      gyms: ["In-building gyms across residential towers"],
      clubs: [],
      hospitals: [],
      parks: [],
      other: ["Ain Dubai (250m observation wheel)", "Pedestrian bridge link to JBR"],
    },
    note: "Small, boutique island community — no schools on-site, families lean on nearby JBR/Marina. Strong short-term rental and tourism presence given Ain Dubai.",
  },
  {
    id: "la-mer",
    totalMembers: 1500, publicN: 1050, privateN: 450,
    name: "La Mer",
    developer: "Meraas",
    area: "Jumeirah 1, beachfront",
    sizeText: "Beachfront lifestyle district split into La Mer South and La Mer North, opened 2017",
    verified: true,
    subCommunities: ["La Mer South", "La Mer North"],
    amenities: {
      schools: [],
      mosques: ["Prayer facilities within the district"],
      churches: [],
      malls: ["La Mer beachfront retail strip"],
      restaurants: ["Extensive beachfront dining and cafés"],
      hotels: ["Rove La Mer"],
      banks: [],
      police: [],
      gyms: ["Beachfront outdoor fitness areas"],
      clubs: [],
      hospitals: [],
      parks: [],
      other: ["Laguna Waterpark", "Public beach with volleyball courts and water sports"],
    },
    note: "More a beach lifestyle/leisure destination than a dense residential community — limited standalone housing stock, mostly low-rise apartments above the retail strip.",
  },
  {
    id: "sobha-hartland",
    totalMembers: 3800, publicN: 2660, privateN: 1140,
    name: "Sobha Hartland",
    developer: "Sobha Realty",
    area: "Mohammed Bin Rashid City",
    sizeText: "8-million-sq-ft green community, roughly 33% dedicated to parks and open space",
    verified: true,
    subCommunities: ["Hartland Villas", "Hartland Greens", "Hartland Waves", "Creek Vistas"],
    amenities: {
      schools: ["Hartland International School (on-site, British/IB curriculum)"],
      mosques: ["Community mosque within the master plan"],
      churches: [],
      malls: ["Community retail plaza (in development alongside residential handovers)"],
      restaurants: ["Cafés and casual dining within Hartland Boulevard"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["In-building gyms across residential towers"],
      clubs: [],
      hospitals: [],
      parks: ["Hartland's central linear park and landscaped canal-front promenade"],
      other: ["Dubai Water Canal frontage", "Extensive tree-lined boulevards"],
    },
    note: "Genuinely has an international school on-site, which is unusual this close to Downtown/Business Bay — a strong draw for families who still want a central location.",
  },
  {
    id: "tilal-al-ghaf",
    totalMembers: 2400, publicN: 1680, privateN: 720,
    name: "Tilal Al Ghaf",
    developer: "Majid Al Futtaim",
    area: "Dubailand",
    sizeText: "780-hectare master community built around a central crystal lagoon (Lagoon Al Ghaf), launched 2019",
    verified: true,
    subCommunities: ["Harmony", "Elan", "Alaya", "Serenity Mansions"],
    amenities: {
      schools: ["Kent College Dubai (on-site)"],
      mosques: ["Community mosque near the town centre"],
      churches: [],
      malls: ["Emirati Village retail hub (planned/phased with community)"],
      restaurants: ["Lagoon-front dining and cafés"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre fitness facilities"],
      clubs: [],
      hospitals: [],
      parks: ["Central Lagoon Al Ghaf (crystal-clear artificial lagoon with sandy beach)"],
      other: ["Water sports on the central lagoon", "Extensive cycling and jogging trails"],
    },
    note: "Known city-wide for its central lagoon — genuinely has a school on-site (Kent College Dubai). Still expanding in phases further from the town centre.",
  },
  {
    id: "jvt",
    totalMembers: 3600, publicN: 2520, privateN: 1080,
    name: "Jumeirah Village Triangle (JVT)",
    developer: "Nakheel",
    area: "Al Barsha South",
    sizeText: "Villa and townhouse-heavy sister community to JVC, organized into numbered districts",
    verified: true,
    subCommunities: ["District 1", "District 2", "District 3", "District 4", "District 5"],
    amenities: {
      schools: ["Sunmarke School (adjacent, shared catchment with JVC)"],
      mosques: ["District-level community mosques"],
      churches: [],
      malls: ["Small retail strips within individual districts — no large mall on-site"],
      restaurants: ["Independent cafés and restaurants scattered through the villa clusters"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre and in-building gyms"],
      clubs: [],
      hospitals: ["Small clinics within district retail strips"],
      parks: ["Community parks distributed across the triangle's districts"],
      other: ["Lower density and quieter than neighbouring JVC — more villas, fewer towers"],
    },
    note: "Quieter, lower-rise counterpart to JVC just across Al Khail Road — fewer big-box amenities, more suited to villa-seeking families on a budget.",
  },
  {
    id: "discovery-gardens",
    totalMembers: 5900, publicN: 4130, privateN: 1770,
    name: "Discovery Gardens",
    developer: "Nakheel",
    area: "Near Ibn Battuta, Jebel Ali",
    sizeText: "Budget-friendly mid-rise community organized into 6 themed clusters (Zen, Mediterranean, Mogul, Contemporary, etc.)",
    verified: true,
    subCommunities: ["Zen Cluster", "Mediterranean Cluster", "Mogul Cluster", "Contemporary Cluster", "Street 1/2 Clusters"],
    amenities: {
      schools: [],
      mosques: ["Community mosque near the central plaza"],
      churches: [],
      malls: ["Ibn Battuta Mall (adjacent, one of Dubai's largest themed malls)"],
      restaurants: ["Casual and budget dining scattered throughout ground-floor retail"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Building-level gyms in most clusters"],
      clubs: [],
      hospitals: ["Aster Clinic and similar community clinics nearby"],
      parks: ["Landscaped courtyards between the low-rise clusters"],
      other: ["Direct access to Ibn Battuta Metro station"],
    },
    note: "One of Dubai's most affordable rental communities, popular with young professionals — no schools on-site but excellent access to Ibn Battuta Mall and the Metro.",
  },
  {
    id: "international-city",
    totalMembers: 7100, publicN: 4970, privateN: 2130,
    name: "International City",
    developer: "Nakheel",
    area: "Al Warsan",
    sizeText: "800-hectare budget community organized into country-themed clusters (China, England, France, Spain, Italy, etc.)",
    verified: true,
    subCommunities: ["China Cluster (Dragon Mart)", "England Cluster", "France Cluster", "Spain Cluster", "Italy Cluster", "Emirates Cluster"],
    amenities: {
      schools: ["Delhi Private School (nearby)"],
      mosques: ["Community mosques within several country clusters"],
      churches: [],
      malls: ["Dragon Mart 1 & 2 (major wholesale/retail hub)"],
      restaurants: ["Very wide, budget-friendly, multicultural dining scene across the clusters"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Independent gyms scattered through retail units"],
      clubs: [],
      hospitals: ["Aster Clinic, Zulekha-affiliated clinics nearby"],
      parks: [],
      other: ["Dragon Mart — one of the largest Chinese-products trading hubs outside China"],
    },
    note: "Dubai's largest and most affordable low-rise community — dense, budget-friendly, and famous city-wide for Dragon Mart.",
  },
  {
    id: "al-furjan",
    totalMembers: 4400, publicN: 3080, privateN: 1320,
    name: "Al Furjan",
    developer: "Nakheel",
    area: "Near Discovery Gardens, Jebel Ali",
    sizeText: "Mixed villa, townhouse and mid-rise apartment community with its own Metro station",
    verified: true,
    subCommunities: ["Al Furjan Villas", "Quortaj", "Sector A–F apartment zones"],
    amenities: {
      schools: ["Arcadia School", "Jebel Ali School (nearby)"],
      mosques: ["Multiple community mosques across the villa and apartment sectors"],
      churches: [],
      malls: ["Al Furjan Pavilion (community retail centre)"],
      restaurants: ["Casual dining at the Pavilion"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre and in-building gyms"],
      clubs: [],
      hospitals: ["Aster Clinic Al Furjan"],
      parks: ["Community parks distributed through the villa clusters"],
      other: ["Al Furjan Metro station (Route 2020 extension)", "Direct access to Discovery Gardens and Ibn Battuta Mall"],
    },
    note: "Well-connected via its own Metro station on the Route 2020 line — a solid mid-market mix of villas and apartments with decent schools nearby.",
  },
  {
    id: "villanova",
    totalMembers: 2000, publicN: 1400, privateN: 600,
    name: "Villanova",
    developer: "Dubai Properties",
    area: "Dubailand",
    sizeText: "Mid-market townhouse and villa community, part of the wider Dubailand development",
    verified: true,
    subCommunities: ["Amaranta", "FitOut", "La Rosa", "Aknan Villas"],
    amenities: {
      schools: [],
      mosques: ["Community mosque within La Rosa"],
      churches: [],
      malls: ["Amaranta community retail centre"],
      restaurants: ["Cafés and casual dining within the retail centre"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre fitness facilities"],
      clubs: [],
      hospitals: ["Community clinic"],
      parks: ["Central community park and cycling tracks"],
      other: [],
    },
    note: "Solid mid-market family community, similar profile to Mudon and Town Square — schools are a short drive away in Damac Hills / Motor City.",
  },
  {
    id: "mudon",
    totalMembers: 2300, publicN: 1610, privateN: 690,
    name: "Mudon",
    developer: "Dubai Properties",
    area: "Dubailand, near Damac Hills",
    sizeText: "Family-focused villa and townhouse community centred on its own community park",
    verified: true,
    subCommunities: ["Mudon Views", "Mudon Al Ranim", "Arabella Townhouses"],
    amenities: {
      schools: ["Ranches Primary School (nearby, shared catchment)"],
      mosques: ["Mudon Community Mosque"],
      churches: [],
      malls: ["Mudon Community Centre (retail + services)"],
      restaurants: ["Casual dining at the Community Centre"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Community centre fitness facilities"],
      clubs: [],
      hospitals: ["Community clinic"],
      parks: ["Mudon Central Park (skate park, dog park, splash pad, running track)"],
      other: ["One of the few Dubai communities with a dedicated dog park"],
    },
    note: "Popular with pet-owning families thanks to its dog park — otherwise a quiet, park-centric villa community similar in spirit to Town Square.",
  },
  {
    id: "bur-dubai",
    totalMembers: 8900, publicN: 6230, privateN: 2670,
    name: "Bur Dubai",
    developer: "Various (historic district, multiple freehold/leasehold developers)",
    area: "Western bank of Dubai Creek",
    sizeText: "One of Dubai's oldest and largest districts · 20+ schools, 25+ clinics/hospitals, 8+ public parks across its many sub-areas",
    verified: true,
    subCommunities: ["Al Mankhool", "Al Raffa", "Al Karama", "Oud Metha", "Umm Hurair", "Al Jaddaf", "Culture Village", "Al Fahidi"],
    amenities: {
      schools: ["Indian High School (Oud Metha)", "GEMS Winchester School", "St. Mary's Catholic High School", "Dubai Gem Private School", "New Academy School (Al Raffa)"],
      mosques: ["Grand Mosque Dubai (tallest minarets in the city, capacity 1,200)", "Iranian Mosque (blue tilework)", "Al Farooq Omar Bin Al Khattab Mosque"],
      churches: ["St. Mary's Catholic Church (Oud Metha) — the emirate's oldest church", "Holy Trinity Church", "St. Thomas Orthodox Cathedral", "The Dubai City Church"],
      malls: ["BurJuman Centre (direct Metro connection)", "Wafi Mall", "Al Khaleej Centre", "Meena Bazaar and the Textile Souk"],
      restaurants: ["Dense concentration of South Asian and Middle Eastern dining around Meena Bazaar and Al Fahidi"],
      hotels: ["Raffles Dubai", "Several mid-range hotels around Al Rolla Road"],
      banks: ["Multiple branches throughout Al Mankhool and Karama"],
      police: ["Al Raffa Police Station"],
      gyms: ["Independent gyms scattered through Al Mankhool and Karama retail strips"],
      clubs: [],
      hospitals: ["Aster Hospital Mankhool", "Iranian Hospital Jumeirah (nearby)", "Dubai Hospital", "Medeor and Mediclinic branches", "Mohammed Bin Rashid University of Medicine and Health Sciences (Dubai Healthcare City)"],
      parks: ["Zabeel Park (under 10 minutes away)", "Dubai Creek Park", "Al Seef Promenade"],
      other: ["Shiva and Krishna Temples and Shirdi Sai Baba Mandir (Al Fahidi) — the UAE's first Hindu temples", "Gurdwara Dubai (Sikh temple)", "Al Fahidi Historical Neighbourhood and Dubai Museum", "Dubai Frame", "Dhow cruises along the Creek"],
    },
    note: "Genuinely the most religiously diverse district in Dubai — mosques, some of the city's oldest churches, and its first Hindu temples all within a short drive of each other. Affordable relative to newer areas, but expect real traffic and older building stock.",
  },
  {
    id: "al-barsha",
    totalMembers: 6700, publicN: 4690, privateN: 2010,
    name: "Al Barsha",
    developer: "Various (established district, multiple developers)",
    area: "Between Sheikh Zayed Road and Al Khail Road",
    sizeText: "Large, established mixed villa/apartment district split into Al Barsha 1, 2, 3 and South",
    verified: true,
    subCommunities: ["Al Barsha 1", "Al Barsha 2", "Al Barsha 3", "Al Barsha South"],
    amenities: {
      schools: ["Dubai American Academy", "Deira International School (Al Barsha South)", "Kings' School Al Barsha", "JSS Private School"],
      mosques: ["Multiple neighbourhood mosques across Al Barsha 1–3"],
      churches: [],
      malls: ["Mall of the Emirates (Ski Dubai)", "City Centre Al Barsha (nearby)"],
      restaurants: ["Wide mix of dining along Al Hudaiba and around Mall of the Emirates"],
      hotels: ["Kempinski Hotel Mall of the Emirates", "Sheraton Mall of the Emirates"],
      banks: ["Multiple branches along Al Barsha main roads"],
      police: ["Al Barsha Police Station"],
      gyms: ["Fitness First and independent gyms throughout"],
      clubs: [],
      hospitals: ["Saudi German Hospital Dubai", "Mediclinic Al Sufouh (nearby)", "American Hospital Clinic (nearby)"],
      parks: ["Al Barsha Pond Park"],
      other: ["Ski Dubai indoor slope (Mall of the Emirates)"],
    },
    note: "Very central and well-connected via the Red Line Metro — a popular mid-to-upper-market choice thanks to Mall of the Emirates and easy access to both Sheikh Zayed Road and Al Khail Road.",
  },
  {
    id: "al-nahda",
    totalMembers: 5400, publicN: 3780, privateN: 1620,
    name: "Al Nahda",
    developer: "Various (established district on the Dubai/Sharjah border)",
    area: "Dubai–Sharjah border",
    sizeText: "Dense, affordable mid-rise apartment district straddling the Dubai/Sharjah border",
    verified: true,
    subCommunities: ["Al Nahda 1 (Dubai)", "Al Nahda 2 (Sharjah side)"],
    amenities: {
      schools: ["Delhi Private School", "Our Own English High School (nearby Sharjah side)"],
      mosques: ["Multiple community mosques throughout"],
      churches: [],
      malls: ["Sahara Centre (Sharjah side)", "Al Nahda Pond Park retail strip"],
      restaurants: ["Very dense, budget-friendly multicultural dining scene"],
      hotels: [],
      banks: ["Multiple branches along Al Nahda Road"],
      police: [],
      gyms: ["Independent gyms scattered through residential towers"],
      clubs: [],
      hospitals: ["NMC Hospital Al Nahda", "Al Nahda Medical Centre"],
      parks: ["Al Nahda Pond Park"],
      other: ["Al Nahda Metro station (Green Line)"],
    },
    note: "One of the most affordable rental areas close to both Dubai and Sharjah — popular with families and commuters who need the price point, though traffic across the border can be heavy at peak hours.",
  },
  {
    id: "mirdif",
    totalMembers: 4600, publicN: 3220, privateN: 1380,
    name: "Mirdif",
    developer: "Dubai Municipality / Emaar (Uptown Mirdif)",
    area: "Near Dubai International Airport",
    sizeText: "Established suburban villa community, popular with Emirati and long-term expat families",
    verified: true,
    subCommunities: ["Mirdif Villas", "Uptown Mirdif", "Mirdif Hills"],
    amenities: {
      schools: ["Uptown International School", "GEMS Wesgreen International School (nearby)", "Star International School Mirdif"],
      mosques: ["Multiple neighbourhood mosques throughout the villa clusters"],
      churches: [],
      malls: ["City Centre Mirdif", "Uptown Mirdif retail strip"],
      restaurants: ["Casual dining within City Centre Mirdif and Uptown Mirdif"],
      hotels: [],
      banks: ["Branches within City Centre Mirdif"],
      police: ["Mirdif Police Station"],
      gyms: ["Fitness First City Centre Mirdif"],
      clubs: [],
      hospitals: ["Zulekha Hospital (nearby)", "Aster Clinic Mirdif"],
      parks: ["Mushrif Park (large family park with camping/BBQ areas)"],
      other: ["Close proximity to Dubai International Airport — some flight noise"],
    },
    note: "A genuinely quiet, established villa suburb — long a favourite for families wanting space without the price tag of newer Emaar/DAMAC communities. Flight paths mean some airport noise depending on the block.",
  },
  {
    id: "jumeirah",
    totalMembers: 5100, publicN: 3570, privateN: 1530,
    name: "Jumeirah",
    developer: "Various (established beachfront district)",
    area: "Coastal, between Bur Dubai and Umm Suqeim",
    sizeText: "Historic low-rise villa district along Jumeirah Beach Road, split into Jumeirah 1, 2 and 3",
    verified: true,
    subCommunities: ["Jumeirah 1", "Jumeirah 2", "Jumeirah 3", "Al Manara"],
    amenities: {
      schools: ["Jumeirah College", "GEMS Jumeirah Primary School", "Horizon English School"],
      mosques: ["Jumeirah Mosque (one of Dubai's most photographed, open for guided non-Muslim visits)"],
      churches: [],
      malls: ["Jumeirah Beach Road retail strip", "Mercato Shopping Mall (Mediterranean-themed)"],
      restaurants: ["Extensive café and restaurant scene along Jumeirah Beach Road"],
      hotels: ["Jumeirah Beach Hotel", "Burj Al Arab (Umm Suqeim border)"],
      banks: ["Multiple branches along Jumeirah Beach Road"],
      police: ["Jumeirah Police Station"],
      gyms: ["Talise Fitness (Jumeirah Beach Hotel)", "Independent studios along Beach Road"],
      clubs: [],
      hospitals: ["Iranian Hospital Jumeirah", "Medcare Hospital"],
      parks: ["Jumeirah Open Beach", "Safa Park (nearby)"],
      other: ["Jumeirah Mosque cultural tours", "Open public beach access"],
    },
    note: "One of Dubai's most established and expensive villa addresses — low-rise, leafy, and close to the beach. Mostly leasehold villas rather than freehold apartments.",
  },
  {
    id: "al-satwa",
    totalMembers: 3400, publicN: 2380, privateN: 1020,
    name: "Al Satwa",
    developer: "Various (established low-rise district)",
    area: "Between Sheikh Zayed Road and Jumeirah",
    sizeText: "Low-rise, budget-friendly district known for its tailoring shops and street food",
    verified: true,
    subCommunities: ["Satwa proper", "Al Hudaiba"],
    amenities: {
      schools: [],
      mosques: ["Multiple neighbourhood mosques"],
      churches: [],
      malls: ["Local retail strips rather than a large mall"],
      restaurants: ["Famous for budget street food and long-running local eateries"],
      hotels: [],
      banks: [],
      police: ["Al Satwa Police Station"],
      gyms: [],
      clubs: [],
      hospitals: ["Rashid Hospital (nearby)"],
      parks: ["Al Safa Park (short drive)"],
      other: ["Well known city-wide for its tailors and fabric shops"],
    },
    note: "One of the most affordable, walkable, old-Dubai neighbourhoods left this close to Downtown/Sheikh Zayed Road — no schools on-site, more of a rental/starter-home district than a family-first one.",
  },
  {
    id: "dubai-silicon-oasis",
    totalMembers: 4200, publicN: 2940, privateN: 1260,
    name: "Dubai Silicon Oasis (DSO)",
    developer: "Dubai Silicon Oasis Authority",
    area: "Dubailand, near Academic City",
    sizeText: "Tech-focused free zone and residential district with villas, townhouses and apartment clusters",
    verified: true,
    subCommunities: ["Cedre Villas", "Silicon Gates", "Binghatti towers", "Queue Point"],
    amenities: {
      schools: ["GEMS FirstPoint School", "Delhi Private School DSO", "Amity School Dubai"],
      mosques: ["Community mosques distributed through the villa and apartment clusters"],
      churches: [],
      malls: ["Silicon Central Mall"],
      restaurants: ["Casual dining within Silicon Central Mall"],
      hotels: [],
      banks: ["Branches within Silicon Central Mall"],
      police: [],
      gyms: ["Fitness First and in-building gyms"],
      clubs: [],
      hospitals: ["Aster Clinic DSO"],
      parks: ["Community parks throughout the villa clusters"],
      other: ["Free zone status — popular with tech and startup companies", "Home to GEMS FirstPoint and several IT parks"],
    },
    note: "A genuine tech hub as much as a residential area — good value apartments and villas, popular with professionals working in the free zone itself.",
  },
  {
    id: "dubai-sports-city",
    totalMembers: 3900, publicN: 2730, privateN: 1170,
    name: "Dubai Sports City",
    developer: "Union Properties",
    area: "Dubailand, near Motor City",
    sizeText: "Sports-themed mixed residential district built around cricket, football and golf venues",
    verified: true,
    subCommunities: ["Victory Heights (villas)", "Elite Sports Residences", "Canal Residence"],
    amenities: {
      schools: ["GEMS Metropole School", "Victory Heights Primary School"],
      mosques: ["Community mosque within Victory Heights"],
      churches: [],
      malls: ["City Centre Me'aisem (nearby)"],
      restaurants: ["Casual dining within the residential clusters and stadium precinct"],
      hotels: ["Novotel and ibis Dubai Sports City"],
      banks: [],
      police: [],
      gyms: ["The Els Club fitness facilities", "In-building gyms across residential towers"],
      clubs: ["The Els Club (golf)", "Dubai International Cricket Stadium", "ICC Academy"],
      hospitals: [],
      parks: ["Victory Heights community parks"],
      other: ["Dubai International Cricket Stadium", "Multiple football academies (Manchester United, Rio Ferdinand)"],
    },
    note: "Built around genuine sporting infrastructure — a big draw for cricket and golf fans specifically, with Victory Heights offering one of the more affordable villa options in this part of Dubailand.",
  },
  {
    id: "motor-city",
    totalMembers: 2900, publicN: 2030, privateN: 870,
    name: "Motor City",
    developer: "Union Properties",
    area: "Dubailand, near Dubai Sports City",
    sizeText: "Motorsport-themed mixed community built around the Dubai Autodrome",
    verified: true,
    subCommunities: ["Green Community Motor City", "Uptown Motor City"],
    amenities: {
      schools: ["GEMS Metropole School (adjacent)", "Renaissance School"],
      mosques: ["Community mosque within Green Community"],
      churches: [],
      malls: ["Green Community retail strip"],
      restaurants: ["Cafés and casual dining within Green Community"],
      hotels: [],
      banks: [],
      police: [],
      gyms: ["Green Community fitness facilities"],
      clubs: ["Dubai Autodrome (racetrack and karting)"],
      hospitals: ["Mediclinic Motor City"],
      parks: ["Green Community's landscaped courtyards and lakes"],
      other: ["Dubai Autodrome — home to UAE motorsport events"],
    },
    note: "Quiet, leafy, and genuinely more residential-feeling than its motorsport branding suggests — Green Community is one of the more established mid-rise apartment options in this corridor.",
  },
  {
    id: "difc",
    totalMembers: 2600, publicN: 1820, privateN: 780,
    name: "DIFC (Dubai International Financial Centre)",
    developer: "DIFC Authority",
    area: "Between Downtown Dubai and Trade Centre",
    sizeText: "Dubai's financial free zone — office towers plus a small but dense luxury residential pocket (Index Tower, South Ridge overlap)",
    verified: true,
    subCommunities: ["Gate Village", "Index Tower", "Central Park Towers"],
    amenities: {
      schools: [],
      mosques: ["Prayer rooms within Gate Village and office towers"],
      churches: [],
      malls: ["Gate Avenue (retail and dining boulevard)"],
      restaurants: ["Dense concentration of fine-dining restaurants along Gate Avenue"],
      hotels: ["Four Seasons Hotel DIFC"],
      banks: ["Home to most major regional and international bank headquarters"],
      police: [],
      gyms: ["In-building gyms across residential towers"],
      clubs: [],
      hospitals: [],
      parks: [],
      other: ["Dubai's main financial and legal free zone — home to the DFSA and DIFC Courts", "Art galleries and sculpture park along Gate Village"],
    },
    note: "Primarily a business and finance district — the residential stock is limited and skews luxury, with no schools on-site. Most residents are professionals working within DIFC itself.",
  },
  {
    id: "al-qusais",
    totalMembers: 4100, publicN: 2870, privateN: 1230,
    name: "Al Qusais",
    developer: "Various (established district)",
    area: "Near Dubai Airport, north of Al Nahda",
    sizeText: "Established, affordable mixed villa and apartment district",
    verified: true,
    subCommunities: ["Al Qusais 1", "Al Qusais 2", "Al Qusais 3", "Al Qusais Industrial Area"],
    amenities: {
      schools: ["Our Own English High School", "Delhi Private School (nearby Al Nahda)"],
      mosques: ["Multiple community mosques throughout"],
      churches: [],
      malls: ["Al Qusais City Centre area retail"],
      restaurants: ["Wide, budget-friendly multicultural dining scene"],
      hotels: [],
      banks: ["Multiple branches throughout"],
      police: ["Al Qusais Police Station"],
      gyms: ["Independent gyms scattered through retail strips"],
      clubs: [],
      hospitals: ["NMC Royal Hospital", "Aster Clinic Al Qusais"],
      parks: ["Al Qusais Park"],
      other: ["Well served by the Green Line Metro (Etisalat, Al Qusais, Dubai Airport Free Zone stations)"],
    },
    note: "A solid, unglamorous, affordable family district — long-established and popular with residents who want good Metro access without central-Dubai rents.",
  },
  {
    id: "al-warqa",
    totalMembers: 3100, publicN: 2170, privateN: 930,
    name: "Al Warqa",
    developer: "Various (established villa district)",
    area: "Near Mirdif, east Dubai",
    sizeText: "Quiet suburban villa district organized into 5 numbered sub-areas",
    verified: true,
    subCommunities: ["Al Warqa 1", "Al Warqa 2", "Al Warqa 3", "Al Warqa 4", "Al Warqa 5"],
    amenities: {
      schools: ["GEMS Our Own English High School Al Warqa", "Al Warqa Private School"],
      mosques: ["Multiple neighbourhood mosques across the numbered sub-areas"],
      churches: [],
      malls: ["Local retail strips within each sub-area"],
      restaurants: ["Casual, mostly independent dining"],
      hotels: [],
      banks: [],
      police: ["Al Warqa Police Station"],
      gyms: [],
      clubs: [],
      hospitals: ["Zulekha Hospital (nearby Mirdif)"],
      parks: ["Al Warqa Park"],
      other: [],
    },
    note: "A quiet, mostly Emirati and long-term-expat villa suburb similar in spirit to Mirdif — limited big-box retail, but genuinely peaceful and family-oriented.",
  },
];

const AMENITY_META = {
  schools: { label: "Schools", icon: GraduationCap, color: "#3A6FA0" },
  mosques: { label: "Mosques", icon: Building2, color: "#1F7A4D" },
  churches: { label: "Churches", icon: Building2, color: "#8A6B1E" },
  malls: { label: "Malls", icon: Building2, color: "#C9A227" },
  restaurants: { label: "Restaurants", icon: Wrench, color: "#C0432E" },
  hotels: { label: "Hotels", icon: Building2, color: "#8A6B1E" },
  banks: { label: "Banks", icon: CreditCard, color: "#1F3D5C" },
  police: { label: "Police Station", icon: ShieldCheck, color: "#1F3D5C" },
  gyms: { label: "Gyms & Fitness", icon: Activity, color: "#C0432E" },
  clubs: { label: "Clubs", icon: Star, color: "#C9A227" },
  hospitals: { label: "Hospitals & Clinics", icon: HandCoins, color: "#C0432E" },
  parks: { label: "Parks", icon: Leaf, color: "#1F7A4D" },
  other: { label: "Other amenities", icon: Sparkles, color: "#00CFFF" },
};

// Nationality mix inside a neighborhood — proportional, illustrative
// starting numbers (like Circles did before real membership existed).
function mockNationalityMix(totalMembers) {
  const mix = [
    ["\ud83c\uddee\ud83c\uddf3", "India", 0.28], ["\ud83c\uddec\ud83c\udde7", "United Kingdom", 0.14], ["\ud83c\uddf5\ud83c\udded", "Philippines", 0.11],
    ["\ud83c\uddf5\ud83c\uddf0", "Pakistan", 0.10], ["\ud83c\uddeb\ud83c\uddf7", "France", 0.07], ["\ud83c\uddea\ud83c\uddec", "Egypt", 0.06],
  ];
  return mix.map(([flag, name, pct]) => ({ flag, name, count: Math.round(totalMembers * pct) }));
}

function NeighborhoodDetail({ hood, onBack }) {
  const [membershipTab, setMembershipTab] = useState("public");
  const [joined, setJoined] = useState(false);
  const totalAmenities = Object.values(hood.amenities).reduce((sum, arr) => sum + arr.length, 0);
  const nationalities = mockNationalityMix(hood.totalMembers);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(hood.name + " Dubai")}`;

  return (
    <div className="p-4 pb-8">
      <button onClick={onBack} className="flex items-center gap-1.5 mb-3 text-sm font-semibold" style={{ color: T.sub }}>
        <ArrowLeft size={16} /> All Neighborhoods
      </button>
      <h2 className="text-xl font-bold" style={{ fontFamily: "Space Grotesk,sans-serif", color: T.ink }}>{hood.name}</h2>
      <div className="text-xs mb-1" style={{ color: T.sub }}>{hood.area}</div>
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="text-xs font-semibold px-2 py-1 rounded-full" style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>
          Developer: {hood.developer}
        </span>
        {hood.verified ? (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#1F7A4D22", color: "#1F7A4D" }}>VERIFIED</span>
        ) : (
          <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: "#C9A22722", color: "#8A6B1E" }}>NEEDS DETAILS</span>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          className="text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1"
          style={{ background: "#00CFFF22", color: "#00CFFF" }}>
          <MapPin size={10} /> View on map
        </a>
      </div>
      <p className="text-xs mb-4" style={{ color: T.sub }}>{hood.sizeText}</p>

      {/* Public / Private resident groups */}
      <div className="p-3 rounded-xl mb-4" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-semibold" style={{ color: T.sub }}>
            {hood.totalMembers.toLocaleString()} residents, workers &amp; agents here
          </div>
          <button onClick={() => setJoined((j) => !j)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: joined ? T.panel : T.signal, color: joined ? T.ink : "#04202A",
              border: joined ? `1px solid ${T.inkLine}` : "none" }}>
            {joined ? "Joined" : "Join"}
          </button>
        </div>
        <div className="flex gap-2 mb-3">
          {["public", "private"].map((t) => (
            <button key={t} onClick={() => setMembershipTab(t)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full capitalize"
              style={{ background: membershipTab === t ? T.signal : T.paper || "#fff",
                color: membershipTab === t ? "#04202A" : T.sub,
                border: `1px solid ${membershipTab === t ? T.signal : T.inkLine}` }}>
              {t} {t === "public" ? `(${hood.publicN.toLocaleString()})` : `(${hood.privateN.toLocaleString()})`}
            </button>
          ))}
        </div>
        {membershipTab === "private" && !joined ? (
          <p className="text-xs" style={{ color: T.sub }}>Private is for residents, agents, and workers who've joined this neighborhood. Join to see it.</p>
        ) : (
          <>
            <div className="text-[11px] font-semibold mb-1.5" style={{ color: T.sub }}>Who's here, by nationality</div>
            <div className="flex flex-wrap gap-1.5">
              {nationalities.map((n) => (
                <span key={n.name} className="text-[11px] px-2 py-1 rounded-full flex items-center gap-1"
                  style={{ background: T.paper || "#fff", border: `1px solid ${T.inkLine}`, color: T.ink }}>
                  {n.flag} {n.name} · {n.count.toLocaleString()}
                </span>
              ))}
            </div>
          </>
        )}
      </div>

      {hood.subCommunities.length > 0 && (
        <>
          <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Sub-communities</div>
          <div className="flex gap-2 flex-wrap mb-4">
            {hood.subCommunities.map((s) => (
              <span key={s} className="text-xs px-2.5 py-1 rounded-full" style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>{s}</span>
            ))}
          </div>
        </>
      )}

      {totalAmenities > 0 ? (
        Object.entries(hood.amenities).map(([key, items]) => {
          if (items.length === 0) return null;
          const meta = AMENITY_META[key];
          const Icon = meta.icon;
          return (
            <div key={key} className="mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold mb-1.5" style={{ color: meta.color }}>
                <Icon size={13} /> {meta.label} ({items.length})
              </div>
              <ul className="pl-1">
                {items.map((item, i) => (
                  <li key={i} className="text-xs mb-1" style={{ color: T.sub }}>• {item}</li>
                ))}
              </ul>
            </div>
          );
        })
      ) : (
        <div className="p-4 rounded-xl text-center mb-4" style={{ background: T.panel, border: `1px dashed ${T.inkLine}` }}>
          <p className="text-xs" style={{ color: T.sub }}>No amenity details yet for {hood.name}. Junction verifies developer info first, then builds out the full picture as residents and agents contribute.</p>
        </div>
      )}

      {hood.note && (
        <div className="mt-3 p-3 rounded-xl text-xs" style={{ background: T.panel, color: T.sub, border: `1px solid ${T.inkLine}` }}>
          ℹ️ {hood.note}
        </div>
      )}
    </div>
  );
}

const COMMUNITY_CIRCLES = [
  { code: "GH", flag: "🇬🇭", name: "Ghana", total: 3000, publicN: 2140, privateN: 860,
    areas: [["Deira", 640], ["Al Nahda", 410], ["Mankhool", 290]] },
  { code: "NG", flag: "🇳🇬", name: "Nigeria", total: 5200, publicN: 3600, privateN: 1600,
    areas: [["Deira", 980], ["Al Qusais", 720], ["Bur Dubai", 510]] },
  { code: "PH", flag: "🇵🇭", name: "Philippines", total: 12400, publicN: 8100, privateN: 4300,
    areas: [["Mankhool", 2100], ["Deira", 1800], ["Al Nahda", 1400]] },
  { code: "IN", flag: "🇮🇳", name: "India", total: 41000, publicN: 26000, privateN: 15000,
    areas: [["Deira", 8200], ["Bur Dubai", 6100], ["Al Qusais", 5400]] },
  { code: "PK", flag: "🇵🇰", name: "Pakistan", total: 18700, publicN: 11200, privateN: 7500,
    areas: [["Deira", 4300], ["Satwa", 2600], ["Al Nahda", 2100]] },
  { code: "FR", flag: "🇫🇷", name: "France", total: 2600, publicN: 1900, privateN: 700,
    areas: [["Downtown", 720], ["Marina", 610], ["JLT", 380]] },
  { code: "GB", flag: "🇬🇧", name: "United Kingdom", total: 4100, publicN: 2900, privateN: 1200,
    areas: [["Marina", 980], ["JBR", 640], ["Downtown", 590]] },
  { code: "EG", flag: "🇪🇬", name: "Egypt", total: 9800, publicN: 6400, privateN: 3400,
    areas: [["Deira", 2100], ["Al Nahda", 1700], ["Mirdif", 1200]] },
  { code: "LB", flag: "🇱🇧", name: "Lebanon", total: 3400, publicN: 2200, privateN: 1200,
    areas: [["Jumeirah", 780], ["Satwa", 540], ["Downtown", 420]] },
  { code: "CN", flag: "🇨🇳", name: "China", total: 6700, publicN: 4300, privateN: 2400,
    areas: [["Dragon Mart", 2400], ["Al Nahda", 1100], ["Deira", 890]] },
];

const CIRCLE_POSTS = [
  { circle: "GH", type: "job", title: "Warehouse supervisor — Al Quoz", sub: "AED 4,200/mo · Posted by verified employer", time: "2h ago" },
  { circle: "GH", type: "announcement", title: "Community meetup — Deira, this Saturday", sub: "Ghana Union UAE · 40 going", time: "5h ago" },
  { circle: "GH", type: "service", title: "Home-cooked jollof catering", sub: "Verified provider · Mankhool", time: "1d ago" },
  { circle: "PH", type: "property", title: "Studio for rent — Mankhool, AED 32,000/yr", sub: "Verified listing", time: "3h ago" },
  { circle: "PH", type: "job", title: "Nanny / housekeeper position", sub: "Al Nahda · Verified family", time: "6h ago" },
  { circle: "FR", type: "service", title: "French-speaking tax advisor", sub: "Verified professional · Downtown", time: "1d ago" },
];

const CIRCLE_TYPE_META = {
  job: { icon: Briefcase, color: "#C9A227" },
  service: { icon: Wrench, color: "#1F7A4D" },
  property: { icon: Building2, color: "#3A6FA0" },
  announcement: { icon: Bell, color: "#00CFFF" },
};

function ViewedByBadge({ count, note }) {
  return (
    <div className="flex items-center gap-1.5 text-[10px]" style={{ color: T.sub }}>
      <Eye size={11}/>
      <span>{count} view{count === 1 ? "" : "s"}{note ? ` · ${note}` : ""}</span>
      <button className="ml-0.5 font-semibold underline decoration-dotted"
        style={{ color: T.signal }}
        onClick={(e) => { e.stopPropagation(); alert("See who viewed — Junction Premium feature, coming soon."); }}>
        See who viewed
      </button>
    </div>
  );
}

function CommunityView({ onOpenPost, onOpenChat, currentUserId }) {
  const [view, setView] = useState("neighborhoods"); // neighborhoods | nationalities
  const [selectedHood, setSelectedHood] = useState(null);
  const [circles, setCircles] = useState(COMMUNITY_CIRCLES);
  const [joinPrompted, setJoinPrompted] = useState(false);
  const [joined, setJoined] = useState({}); // { GH: true }
  const [selected, setSelected] = useState(null); // circle code
  const [circleTab, setCircleTab] = useState("public"); // public | private
  const [showAddCircle, setShowAddCircle] = useState(false);
  const [newName, setNewName] = useState("");
  const [newFlag, setNewFlag] = useState("");
  const [realCirclePosts, setRealCirclePosts] = useState([]);
  const [quickPostOpen, setQuickPostOpen] = useState(false);
  const [quickPostTitle, setQuickPostTitle] = useState("");
  const [quickPostType, setQuickPostType] = useState("announcement");

  // Load real posts for whichever circle is open — falls back to just the
  // seeded mock posts if the backend isn't connected yet.
  useEffect(() => {
    if (!selected) return;
    fetch(`/api/circles/${selected}/posts`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.posts?.length) return;
        setRealCirclePosts(
          data.posts.map((p) => ({
            circle: selected, type: p.type, title: p.title,
            sub: p.body || "Posted in this Circle", time: "just now", isLive: true,
          }))
        );
      })
      .catch(() => {});
  }, [selected]);

  const submitQuickPost = () => {
    if (!quickPostTitle.trim() || !selected) return;
    setRealCirclePosts((prev) => [
      { circle: selected, type: quickPostType, title: quickPostTitle.trim(), sub: "Posted in this Circle", time: "just now", isLive: true },
      ...prev,
    ]);
    fetch(`/api/circles/${selected}/posts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: quickPostTitle.trim(), type: quickPostType, authorId: currentUserId || null }),
    }).catch(() => {});
    setQuickPostTitle("");
    setQuickPostOpen(false);
  };

  const circle = circles.find((c) => c.code === selected);

  // Pull real circles from the database once loaded — unions with the
  // seeded list so any custom circle you created earlier (in a previous
  // visit to this tab) actually persists instead of vanishing on remount.
  useEffect(() => {
    fetch("/api/circles")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data?.circles?.length) return;
        setCircles((prev) => {
          const byCode = new Map(prev.map((c) => [c.code, c]));
          for (const real of data.circles) {
            const existing = byCode.get(real.code);
            if (existing) {
              if (Number(real.total) > 0) byCode.set(real.code, { ...existing, total: Number(real.total) });
            } else {
              // a circle that exists in the DB but not in the seeded list —
              // e.g. one you created earlier — add it back in
              byCode.set(real.code, {
                code: real.code, name: real.name, flag: real.flag,
                total: Number(real.total) || 1, publicN: Number(real.total) || 1, privateN: 0,
                areas: [["Not set yet", 1]],
              });
            }
          }
          return Array.from(byCode.values());
        });
      })
      .catch(() => {});
  }, []);

  const addCircle = () => {
    if (!newName.trim()) return;
    const code = newName.trim().slice(0, 3).toUpperCase() + Math.floor(Math.random() * 90 + 10);
    const fresh = {
      code, flag: newFlag.trim() || "🏳️", name: newName.trim(),
      total: 1, publicN: 1, privateN: 0, areas: [["Not set yet", 1]],
    };
    setCircles((prev) => [...prev, fresh]);
    setJoined((j) => ({ ...j, [code]: true }));
    setNewName(""); setNewFlag(""); setShowAddCircle(false);
    setJoinPrompted(true);
    setSelected(code);

    // Persist the new circle for real — falls back gracefully if the
    // backend isn't connected yet, the circle still works locally either way.
    fetch("/api/circles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fresh.name, flag: fresh.flag }),
    }).catch(() => {});
  };

  // Neighborhoods is the default entry into Community now — nationality
  // groups live nested inside each neighborhood's Public/Private tabs
  // instead of being a separate top-level thing to navigate to.
  if (view === "neighborhoods") {
    if (selectedHood) {
      return <NeighborhoodDetail hood={NEIGHBORHOODS.find((h) => h.id === selectedHood)} onBack={() => setSelectedHood(null)} />;
    }
    return (
      <div className="p-4 pb-8">
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "Space Grotesk,sans-serif", color: T.ink }}>Neighborhoods</h2>
        <p className="text-xs mb-1" style={{ color: T.sub }}>
          Every major Dubai community — who built it, what's actually inside, and who lives there. No other UAE app lets you see this before you visit.
        </p>
        <button onClick={() => setView("nationalities")} className="text-xs font-semibold mb-4" style={{ color: T.signal }}>
          Browse by nationality across all of Dubai instead →
        </button>
        <div className="grid grid-cols-1 gap-2.5">
          {NEIGHBORHOODS.map((n) => {
            const count = Object.values(n.amenities).reduce((sum, arr) => sum + arr.length, 0);
            return (
              <button key={n.id} onClick={() => setSelectedHood(n.id)}
                className="p-3.5 rounded-xl text-left flex items-center justify-between"
                style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
                <div>
                  <div className="text-sm font-semibold" style={{ color: T.ink }}>{n.name}</div>
                  <div className="text-[11px]" style={{ color: T.sub }}>By {n.developer} · {n.totalMembers.toLocaleString()} here</div>
                  <div className="text-[10px] mt-1" style={{ color: n.verified ? "#1F7A4D" : "#8A6B1E" }}>
                    {n.verified ? `${count} amenities listed` : "Needs details"}
                  </div>
                </div>
                <ChevronRight size={16} color={T.sub} />
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  if (!joinPrompted) {
    const topCircles = [...circles].sort((a, b) => b.total - a.total).slice(0, 4);
    return (
      <div className="p-5 flex flex-col items-center text-center" style={{ minHeight: "60vh" }}>
        <button onClick={() => setView("neighborhoods")} className="self-start flex items-center gap-1.5 mb-3 text-xs font-semibold" style={{ color: T.sub }}>
          <ArrowLeft size={14} /> Neighborhoods
        </button>
        <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "Space Grotesk,sans-serif", color: T.ink }}>
          Join your Community Circle
        </h2>
        <p className="text-sm mb-5 max-w-xs" style={{ color: T.sub }}>
          The largest verified communities in the UAE right now. Connect with jobs,
          services, and people from home — in your neighborhood.
        </p>
        <div className="w-full flex flex-col gap-2 max-w-xs">
          {topCircles.map((c) => (
            <button key={c.code}
              onClick={() => { setJoined((j) => ({ ...j, [c.code]: true })); setJoinPrompted(true); setSelected(c.code); }}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-left"
              style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
              <div className="text-2xl">{c.flag}</div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold" style={{ color: T.ink }}>{c.name}</div>
                <div className="text-[11px]" style={{ color: T.sub }}>
                  {c.total.toLocaleString()} members · top area {c.areas[0][0]}
                </div>
              </div>
              <ChevronRight size={16} color={T.sub}/>
            </button>
          ))}
        </div>
        <button onClick={() => setJoinPrompted(true)}
          className="mt-4 text-xs font-semibold underline"
          style={{ color: T.sub }}>
          Not now — just browse all Circles
        </button>
        <button onClick={() => { setJoinPrompted(true); setShowAddCircle(true); }}
          className="mt-2 text-xs font-semibold"
          style={{ color: T.signal }}>
          Don't see your country? Start its Circle
        </button>
      </div>
    );
  }

  if (circle) {
    const posts = [...realCirclePosts, ...CIRCLE_POSTS.filter((p) => p.circle === circle.code)];
    const isJoined = !!joined[circle.code];
    return (
      <div className="pb-6">
        <div className="p-4 flex items-center gap-3" style={{ borderBottom: `1px solid ${T.inkLine}` }}>
          <button onClick={() => setSelected(null)} className="p-1"><ArrowLeft size={18} color={T.ink}/></button>
          <div className="text-3xl">{circle.flag}</div>
          <div className="flex-1">
            <div className="font-bold text-base" style={{ color: T.ink }}>{circle.name} Circle</div>
            <div className="text-xs" style={{ color: T.sub }}>{circle.total.toLocaleString()} members · UAE-wide</div>
          </div>
          <button onClick={() => {
              const willJoin = !joined[circle.code];
              setJoined((j) => ({ ...j, [circle.code]: willJoin }));
              if (willJoin) {
                fetch("/api/circles", {
                  method: "PATCH",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ code: circle.code, userId: currentUserId || null }),
                }).catch(() => {});
              }
            }}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg"
            style={{ background: isJoined ? T.panel : T.signal, color: isJoined ? T.ink : "#04202A",
              border: isJoined ? `1px solid ${T.inkLine}` : "none" }}>
            {isJoined ? "Joined" : "Join"}
          </button>
        </div>

        <div className="px-4 pt-3">
          <ViewedByBadge count={214} note="12 from outside your Circle"/>
        </div>

        <div className="flex gap-2 px-4 pt-3">
          {["public", "private"].map((t) => (
            <button key={t} onClick={() => setCircleTab(t)}
              className="text-xs font-semibold px-4 py-1.5 rounded-full capitalize"
              style={{ background: circleTab === t ? T.signal : T.panel,
                color: circleTab === t ? "#04202A" : T.sub,
                border: `1px solid ${circleTab === t ? T.signal : T.inkLine}` }}>
              {t} {t === "public" ? `(${circle.publicN.toLocaleString()})` : `(${circle.privateN.toLocaleString()})`}
            </button>
          ))}
        </div>
        {circleTab === "private" && !isJoined && (
          <div className="mx-4 mt-3 p-3 rounded-xl text-xs" style={{ background: T.panel, color: T.sub, border: `1px solid ${T.inkLine}` }}>
            Private posts are for members only. Join the Circle to see them.
          </div>
        )}

        <div className="flex gap-2 px-4 pt-3">
          <button onClick={onOpenChat}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg"
            style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>
            <MessageCircle size={13}/> Chat
          </button>
          <button onClick={() => alert("Voice calling isn't built yet — it needs a calling service (like Twilio) connected first.")}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg"
            style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>
            <Phone size={13}/> Call
          </button>
          <button onClick={() => alert("Video calling isn't built yet — it needs a calling service (like Twilio) connected first.")}
            className="flex-1 flex items-center justify-center gap-1.5 text-xs font-semibold py-2 rounded-lg"
            style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>
            <Video size={13}/> Video
          </button>
        </div>

        <div className="px-4 pt-4">
          <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Top areas</div>
          <div className="flex gap-2 flex-wrap mb-4">
            {circle.areas.map(([area, n]) => (
              <div key={area} className="text-[11px] px-2.5 py-1 rounded-full"
                style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>
                {area} · {n.toLocaleString()}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <div className="text-xs font-semibold" style={{ color: T.sub }}>
              {circleTab === "public" ? "Public posts" : "Private posts"}
            </div>
            <button onClick={() => setQuickPostOpen((v) => !v)} className="text-xs font-semibold" style={{ color: T.signal }}>+ Post</button>
          </div>

          {quickPostOpen && (
            <div className="p-3 rounded-xl mb-3" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
              <select value={quickPostType} onChange={(e) => setQuickPostType(e.target.value)}
                className="w-full mb-2 rounded-lg text-xs px-2.5 py-2"
                style={{ background: T.paper || "#fff", border: `1px solid ${T.inkLine}`, color: T.ink }}>
                <option value="announcement">Announcement</option>
                <option value="job">Job</option>
                <option value="service">Service</option>
              </select>
              <input value={quickPostTitle} onChange={(e) => setQuickPostTitle(e.target.value)}
                placeholder={`Post something in ${circle.name}...`}
                className="w-full mb-2 rounded-lg text-xs px-2.5 py-2"
                style={{ background: T.paper || "#fff", border: `1px solid ${T.inkLine}`, color: T.ink }} />
              <button onClick={submitQuickPost}
                className="w-full text-xs font-semibold py-2 rounded-lg"
                style={{ background: T.signal, color: "#04202A" }}>Post to {circle.name}</button>
            </div>
          )}
          {(circleTab === "private" && !isJoined) ? null : posts.length === 0 ? (
            <div className="text-xs py-6 text-center" style={{ color: T.sub }}>No posts yet in this Circle.</div>
          ) : (
            <div className="flex flex-col gap-2">
              {posts.map((p, i) => {
                const meta = CIRCLE_TYPE_META[p.type];
                const Icon = meta.icon;
                return (
                  <div key={i} className="p-3 rounded-xl flex items-start gap-3"
                    style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
                    <div className="p-2 rounded-lg" style={{ background: `${meta.color}22` }}>
                      <Icon size={14} color={meta.color}/>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold" style={{ color: T.ink }}>{p.title}</div>
                      <div className="text-xs" style={{ color: T.sub }}>{p.sub}</div>
                    </div>
                    <div className="text-[10px]" style={{ color: T.sub }}>{p.time}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 pb-6">
      <button onClick={() => setView("neighborhoods")} className="flex items-center gap-1.5 mb-3 text-xs font-semibold" style={{ color: T.sub }}>
        <ArrowLeft size={14} /> Neighborhoods
      </button>
      <h2 className="text-lg font-bold mb-1" style={{ fontFamily: "Space Grotesk,sans-serif", color: T.ink }}>
        Community Circles
      </h2>
      <p className="text-xs mb-4" style={{ color: T.sub }}>
        Every nationality, verified. Jobs, services, and listings shared by people from your own community.
      </p>

      {showAddCircle && (
        <div className="p-3 rounded-xl mb-4" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
          <div className="text-xs font-semibold mb-2" style={{ color: T.ink }}>Start a new Circle</div>
          <div className="flex gap-2 mb-2">
            <input value={newFlag} onChange={(e) => setNewFlag(e.target.value)} placeholder="🏳️"
              maxLength={4} className="w-14 text-center rounded-lg text-lg py-1.5"
              style={{ background: T.paper || "#fff", border: `1px solid ${T.inkLine}` }}/>
            <input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Country name"
              className="flex-1 rounded-lg text-sm px-3 py-1.5"
              style={{ background: T.paper || "#fff", border: `1px solid ${T.inkLine}`, color: T.ink }}/>
          </div>
          <div className="flex gap-2">
            <button onClick={addCircle}
              className="flex-1 text-xs font-semibold py-2 rounded-lg"
              style={{ background: T.signal, color: "#04202A" }}>Create Circle</button>
            <button onClick={() => setShowAddCircle(false)}
              className="text-xs font-semibold py-2 px-3 rounded-lg"
              style={{ background: "transparent", color: T.sub, border: `1px solid ${T.inkLine}` }}>Cancel</button>
          </div>
          <div className="text-[10px] mt-2" style={{ color: T.sub }}>
            You'll be the founding member — invite others from your community to grow it.
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {[...circles].sort((a, b) => b.total - a.total).map((c) => (
          <button key={c.code} onClick={() => setSelected(c.code)}
            className="p-3 rounded-xl text-left flex items-center gap-2.5"
            style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
            <div className="text-2xl">{c.flag}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate" style={{ color: T.ink }}>{c.name}</div>
              <div className="text-[10px]" style={{ color: T.sub }}>{c.total.toLocaleString()} members</div>
              {joined[c.code] && <div className="text-[9px] font-semibold" style={{ color: T.signal }}>Joined</div>}
            </div>
          </button>
        ))}
        <button onClick={() => setShowAddCircle(true)}
          className="p-3 rounded-xl text-left flex items-center gap-2.5"
          style={{ background: "transparent", border: `1.5px dashed ${T.inkLine}` }}>
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ border: `1.5px dashed ${T.sub}` }}>
            <span style={{ color: T.sub, fontSize: 18, lineHeight: 1 }}>+</span>
          </div>
          <div className="text-sm font-semibold" style={{ color: T.sub }}>Add your country</div>
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// JUNCTION EVENTS — organize, discover, and RSVP to real events
// across the UAE. Three organizer tiers scale from "just list it"
// to "Junction plans it and reaches out to the venue for you."
// ---------------------------------------------------------------
const EVENT_CATEGORIES = [
  { id: "dining", name: "Dinner & Dining", icon: Utensils, color: "#C9612B" },
  { id: "networking", name: "Networking & Business", icon: Briefcase, color: "#0E2A44" },
  { id: "culture", name: "Cultural & Heritage", icon: Globe2, color: "#8A6A1E" },
  { id: "beach", name: "Beach & Outdoor", icon: Sun, color: "#1FA8A8" },
  { id: "nightlife", name: "Nightlife & Music", icon: Music, color: "#5B2E8A" },
  { id: "family", name: "Family & Kids", icon: Gift, color: "#1F7A4D" },
  { id: "sports", name: "Sports & Fitness", icon: Activity, color: "#B5342A" },
  { id: "wellness", name: "Wellness", icon: Heart, color: "#C2447A" },
  { id: "community", name: "Community Meetup", icon: Users, color: "#00CFFF" },
  { id: "adventure", name: "Desert & Adventure", icon: Wind, color: "#C9A227" },
];

const EVENT_SIZE_TIERS = [
  { id: "small", label: "Small", desc: "Up to 20 guests" },
  { id: "medium", label: "Medium", desc: "21–80 guests" },
  { id: "large", label: "Large", desc: "81–300 guests" },
  { id: "mega", label: "Mega", desc: "300+ guests" },
];

const ORGANIZER_TIERS = [
  {
    id: "basic", name: "Self-Organize", icon: Ticket, color: "#7B8AA0",
    priceBySize: { small: 10, medium: 25, large: 60, mega: 150 },
    tagline: "You handle everything — Junction lists it and generates tickets.",
    includes: ["Event listing across Live/Upcoming/Past", "Ticket generation with QR check-in", "RSVP tracking"],
    aiPlanning: false, venueOutreach: false, marketing: false,
  },
  {
    id: "assisted", name: "AI-Assisted", icon: Sparkles, color: "#1F7A4D",
    priceBySize: { small: 99, medium: 249, large: 599, mega: 1499 },
    tagline: "Junction AI plans it with you — venue type, food, drink, and budget — you take it from there.",
    includes: ["Everything in Self-Organize", "AI venue, food & drink suggestions", "AI budget estimate", "Priority placement in the Events feed"],
    aiPlanning: true, venueOutreach: false, marketing: false,
  },
  {
    id: "premium", name: "Full Concierge", icon: Crown, color: "#C9A227",
    priceBySize: { small: 299, medium: 699, large: 1699, mega: 3999 },
    tagline: "Junction plans it AND has a concierge reach out to the venue to confirm details on your behalf.",
    includes: ["Everything in AI-Assisted", "Junction concierge contacts the venue for you", "Dedicated event page", "Optional social media promotion add-on"],
    aiPlanning: true, venueOutreach: true, marketing: "addon",
  },
];
const MARKETING_ADDON_PRICE = { small: 149, medium: 299, large: 599, mega: 1299 };

function EventOrganizeFlow({ currentUser, onClose, onCreated }) {
  const [step, setStep] = useState(0); // 0: AI brief, 1: pick suggestion, 2: tier+size, 3: details+consent
  const [brief, setBrief] = useState("");
  const [asking, setAsking] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [aiError, setAiError] = useState("");
  const [chosenSuggestion, setChosenSuggestion] = useState(null);
  const [sizeId, setSizeId] = useState("small");
  const [tierId, setTierId] = useState("basic");
  const [wantsMarketing, setWantsMarketing] = useState(false);
  const [consentOutreach, setConsentOutreach] = useState(false);
  const [form, setForm] = useState({ title: "", category: "dining", venueName: "", area: "", startsAt: "", capacity: "", priceAed: "0", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const askAi = async () => {
    if (!brief.trim()) return;
    setAsking(true);
    setAiError("");
    try {
      const reply = await callJunctionAI({
        system: `You are Junction AI's event planner for the UAE. The person will describe an event they want to host. Reply with ONLY valid JSON (no markdown fences, no commentary) matching this shape:
{"suggestions":[{"venueType":"...","vibe":"...","area":"...","estCostPerPersonAed":0,"foodIdea":"...","drinkIdea":"...","whyItFits":"..."}]}
Give exactly 3 distinct, realistic suggestions grounded in real Dubai/UAE venue types and price levels (e.g. rooftop lounge, beach club, majlis-style restaurant, private dining room, desert camp). Costs should be realistic AED per-person estimates for the UAE market.`,
        messages: [{ role: "user", content: brief.trim() }],
        maxTokens: 700,
      });
      const cleaned = reply.trim().replace(/^```json\s*|```$/g, "");
      const parsed = JSON.parse(cleaned);
      setSuggestions(parsed.suggestions || []);
      setStep(1);
    } catch (e) {
      setAiError(`Junction AI couldn't generate suggestions — ${e.message}. You can still skip ahead and fill details manually.`);
    } finally {
      setAsking(false);
    }
  };

  const pickSuggestion = (s) => {
    setChosenSuggestion(s);
    setForm((f) => ({
      ...f,
      title: f.title || `${s.venueType} — ${s.vibe}`,
      area: s.area || f.area,
      description: `${s.whyItFits}\n\nSuggested food: ${s.foodIdea}\nSuggested drink: ${s.drinkIdea}`,
      priceAed: String(s.estCostPerPersonAed || 0),
    }));
    setStep(2);
  };

  const tier = ORGANIZER_TIERS.find((t) => t.id === tierId);
  const basePrice = tier?.priceBySize[sizeId] || 0;
  const marketingPrice = wantsMarketing ? MARKETING_ADDON_PRICE[sizeId] : 0;
  const totalOrganizerFee = basePrice + marketingPrice;

  const submit = async () => {
    if (!form.title.trim() || !form.startsAt) { setSubmitError("Title and date/time are required."); return; }
    setSubmitting(true);
    setSubmitError("");
    try {
      const res = await fetch("/api/events", {
        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          category: form.category,
          description: form.description,
          venueName: form.venueName || chosenSuggestion?.venueType || null,
          area: form.area,
          startsAt: form.startsAt,
          capacity: form.capacity ? parseInt(form.capacity, 10) : null,
          priceAed: parseFloat(form.priceAed || "0"),
          organizerTier: tierId,
          aiPlan: chosenSuggestion || null,
          conciergeRequested: tierId === "premium" && consentOutreach,
          marketingRequested: wantsMarketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setSubmitError(data.error || "Couldn't create the event."); return; }
      onCreated(data.event);
    } catch (e) {
      setSubmitError(`Couldn't reach the server — ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center" style={{ background: "rgba(4,17,31,0.6)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl overflow-hidden flex flex-col" style={{ background: "#fff", maxHeight: "92vh" }}>
        <div className="p-4 flex items-center justify-between shrink-0" style={{ background: "linear-gradient(135deg,#0E2A44,#163A5C)" }}>
          <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>
            <PartyPopper size={15} /> Organize an event
          </div>
          <button onClick={onClose}><X size={18} color="#fff" /></button>
        </div>

        <div className="p-4 overflow-y-auto flex-1">
          {step === 0 && (
            <>
              <p className="text-sm mb-3" style={{ color: T.ink }}>
                Tell Junction AI what you're thinking — as loosely as you like.
              </p>
              <textarea value={brief} onChange={(e) => setBrief(e.target.value)} rows={4}
                placeholder="e.g. I want to organize a dinner with 12 friends in Dubai but I don't know where to go or how much it'll cost…"
                className="w-full text-sm px-3 py-2.5 rounded-xl border outline-none mb-2" style={{ borderColor: T.line }} />
              {aiError && <p className="text-xs mb-2" style={{ color: "#E0554C" }}>{aiError}</p>}
              <div className="flex gap-2">
                <button onClick={askAi} disabled={asking || !brief.trim()} className="flex-1 text-sm font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                  style={{ background: "linear-gradient(135deg,#00CFFF,#0E2A44)", color: "#fff", opacity: asking || !brief.trim() ? 0.6 : 1 }}>
                  {asking ? <><Loader2 size={14} className="animate-spin" /> Thinking…</> : <><Sparkles size={14} /> Ask Junction AI</>}
                </button>
                <button onClick={() => setStep(2)} className="text-sm font-semibold px-4 py-2.5 rounded-xl" style={{ background: T.panel, color: T.sub }}>Skip</button>
              </div>
            </>
          )}

          {step === 1 && suggestions && (
            <>
              <p className="text-sm font-semibold mb-3" style={{ color: T.ink }}>A few ideas for you:</p>
              <div className="flex flex-col gap-2 mb-3">
                {suggestions.map((s, i) => (
                  <button key={i} onClick={() => pickSuggestion(s)} className="text-left p-3 rounded-xl border" style={{ borderColor: T.line }}>
                    <div className="text-sm font-bold" style={{ color: T.ink }}>{s.venueType} — {s.vibe}</div>
                    <div className="text-xs mt-0.5" style={{ color: T.sub }}>{s.area} · ~AED {s.estCostPerPersonAed}/person</div>
                    <div className="text-xs mt-1" style={{ color: T.ink }}>{s.whyItFits}</div>
                    <div className="text-[11px] mt-1.5" style={{ color: T.sub }}>🍽 {s.foodIdea} · 🥂 {s.drinkIdea}</div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)} className="text-xs font-semibold" style={{ color: T.navy }}>None of these — fill in manually →</button>
            </>
          )}

          {step === 2 && (
            <>
              <p className="text-sm font-semibold mb-2" style={{ color: T.ink }}>How big is it?</p>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {EVENT_SIZE_TIERS.map((s) => (
                  <button key={s.id} onClick={() => setSizeId(s.id)} className="text-left p-2.5 rounded-xl border"
                    style={{ borderColor: sizeId === s.id ? T.signal : T.line, background: sizeId === s.id ? `${T.signal}12` : "#fff" }}>
                    <div className="text-xs font-bold" style={{ color: T.ink }}>{s.label}</div>
                    <div className="text-[10px]" style={{ color: T.sub }}>{s.desc}</div>
                  </button>
                ))}
              </div>
              <p className="text-sm font-semibold mb-2" style={{ color: T.ink }}>How much help do you want?</p>
              <div className="flex flex-col gap-2 mb-4">
                {ORGANIZER_TIERS.map((t) => {
                  const Icon = t.icon;
                  const price = t.priceBySize[sizeId];
                  return (
                    <button key={t.id} onClick={() => setTierId(t.id)} className="text-left p-3 rounded-xl border"
                      style={{ borderColor: tierId === t.id ? t.color : T.line, borderWidth: tierId === t.id ? 2 : 1 }}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-sm font-bold" style={{ color: T.ink }}>
                          <Icon size={14} style={{ color: t.color }} /> {t.name}
                        </div>
                        <div className="text-sm font-bold" style={{ color: t.color }}>AED {price}</div>
                      </div>
                      <p className="text-[11px] mt-1" style={{ color: T.sub }}>{t.tagline}</p>
                    </button>
                  );
                })}
              </div>
              {tierId === "premium" && (
                <label className="flex items-start gap-2 mb-3 text-xs p-2.5 rounded-lg" style={{ background: T.panel, color: T.ink }}>
                  <input type="checkbox" checked={consentOutreach} onChange={(e) => setConsentOutreach(e.target.checked)} className="mt-0.5" />
                  I authorize Junction to contact the venue on my behalf to confirm availability and details.
                  If unchecked, Junction still plans everything — you just do the outreach yourself.
                </label>
              )}
              {(tier?.marketing === "addon") && (
                <label className="flex items-start gap-2 mb-4 text-xs p-2.5 rounded-lg" style={{ background: T.panel, color: T.ink }}>
                  <input type="checkbox" checked={wantsMarketing} onChange={(e) => setWantsMarketing(e.target.checked)} className="mt-0.5" />
                  Add social media promotion for +AED {MARKETING_ADDON_PRICE[sizeId]} — Junction posts your event for visibility.
                </label>
              )}
              <button onClick={() => setStep(3)} className="w-full text-sm font-bold py-2.5 rounded-xl" style={{ background: T.ink, color: "#fff" }}>Continue</button>
            </>
          )}

          {step === 3 && (
            <>
              <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="Event title"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={{ borderColor: T.line }} />
              <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={{ borderColor: T.line }}>
                {EVENT_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              <input value={form.venueName} onChange={(e) => setForm((f) => ({ ...f, venueName: e.target.value }))} placeholder="Venue name (if known)"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={{ borderColor: T.line }} />
              <input value={form.area} onChange={(e) => setForm((f) => ({ ...f, area: e.target.value }))} placeholder="Area / Emirate"
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={{ borderColor: T.line }} />
              <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))}
                className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-2" style={{ borderColor: T.line }} />
              <div className="grid grid-cols-2 gap-2 mb-2">
                <input type="number" value={form.capacity} onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))} placeholder="Capacity"
                  className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
                <input type="number" value={form.priceAed} onChange={(e) => setForm((f) => ({ ...f, priceAed: e.target.value }))} placeholder="Ticket price (AED)"
                  className="text-sm px-3 py-2 rounded-lg border outline-none" style={{ borderColor: T.line }} />
              </div>
              <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3}
                placeholder="Description" className="w-full text-sm px-3 py-2 rounded-lg border outline-none mb-3" style={{ borderColor: T.line }} />

              <div className="flex items-center justify-between p-3 rounded-xl mb-3" style={{ background: T.panel }}>
                <span className="text-xs font-semibold" style={{ color: T.sub }}>Organizer fee ({tier?.name}{wantsMarketing ? " + Marketing" : ""})</span>
                <span className="text-sm font-bold" style={{ color: T.ink }}>AED {totalOrganizerFee}</span>
              </div>
              {submitError && <p className="text-xs mb-2" style={{ color: "#E0554C" }}>{submitError}</p>}
              <button onClick={submit} disabled={submitting} className="w-full text-sm font-bold py-3 rounded-xl"
                style={{ background: "linear-gradient(135deg,#00CFFF,#0E2A44)", color: "#fff", opacity: submitting ? 0.6 : 1 }}>
                {submitting ? "Publishing…" : `Publish event · AED ${totalOrganizerFee}`}
              </button>
              <p className="text-[10px] mt-2 text-center" style={{ color: T.sub }}>
                Payment isn't wired up yet — this publishes immediately. Billing will be added before this goes live to the public.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onRsvp, currentUser }) {
  const cat = EVENT_CATEGORIES.find((c) => c.id === event.category) || EVENT_CATEGORIES[0];
  const Icon = cat.icon;
  const date = new Date(event.starts_at);
  return (
    <div className="rounded-2xl overflow-hidden border mb-3" style={{ borderColor: T.line, background: "#fff" }}>
      <div className="h-20 relative flex items-center justify-between px-4" style={{ background: `linear-gradient(135deg,${cat.color},#0A0F1A)` }}>
        <Icon size={22} color="#fff" style={{ opacity: 0.9 }} />
        {event.status === "live" && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1" style={{ background: "#E0554C", color: "#fff" }}>
            <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" /> LIVE NOW
          </span>
        )}
      </div>
      <div className="p-3.5">
        <div className="text-sm font-bold" style={{ color: T.ink }}>{event.title}</div>
        <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.sub }}>
          <Calendar size={11} /> {date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
        </div>
        {event.area && <div className="text-xs mt-0.5 flex items-center gap-1" style={{ color: T.sub }}><MapPin size={11} /> {event.venue_name ? `${event.venue_name}, ` : ""}{event.area}</div>}
        <div className="flex items-center justify-between mt-2.5">
          <div className="text-xs font-semibold" style={{ color: T.ink }}>
            {Number(event.price_aed) > 0 ? `AED ${event.price_aed}` : "Free"} · {event.going_count || 0} going
          </div>
          <button onClick={() => onRsvp(event)} disabled={!currentUser}
            className="text-[11px] font-bold px-3 py-1.5 rounded-full flex items-center gap-1"
            style={{ background: T.ink, color: "#fff", opacity: currentUser ? 1 : 0.5 }}>
            <Ticket size={11} /> RSVP
          </button>
        </div>
      </div>
    </div>
  );
}

function EventsView({ currentUser, onSignIn }) {
  const [status, setStatus] = useState("upcoming");
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showOrganize, setShowOrganize] = useState(false);
  const [ticketMsg, setTicketMsg] = useState("");

  useEffect(() => {
    setLoading(true);
    fetch(`/api/events?status=${status}`, { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setEvents(data?.events || []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [status]);

  const rsvp = async (event) => {
    if (!currentUser) return onSignIn();
    try {
      const res = await fetch("/api/events", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "rsvp", eventId: event.id }),
      });
      const data = await res.json();
      if (!res.ok) { setTicketMsg(`Couldn't RSVP — ${data.error}`); return; }
      setTicketMsg(`You're in! Ticket code: ${data.ticket.ticket_code}`);
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, going_count: (parseInt(e.going_count) || 0) + 1 } : e));
    } catch (e) {
      setTicketMsg(`Couldn't reach the server — ${e.message}`);
    }
    setTimeout(() => setTicketMsg(""), 4000);
  };

  return (
    <div className="p-4 pb-24">
      <div className="relative overflow-hidden rounded-2xl mb-4 px-5 py-6" style={{ background: "linear-gradient(135deg,#0E2A44 0%,#8A6A1E 100%)" }}>
        <SkylineSilhouette />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <PartyPopper size={18} color="#fff" />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>JUNCTION EVENTS</span>
          </div>
          <h2 className="text-lg font-bold" style={{ color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>Every event in the UAE, one feed.</h2>
          <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.8)" }}>Organize your own — from a AED 10 dinner to a fully AI-planned, venue-confirmed launch party.</p>
        </div>
      </div>

      {ticketMsg && (
        <div className="text-xs font-semibold p-2.5 rounded-lg mb-3" style={{ background: "#E9F4EE", color: "#1F7A4D" }}>{ticketMsg}</div>
      )}

      <div className="flex items-center gap-2 mb-4">
        {["live", "upcoming", "past"].map((s) => (
          <button key={s} onClick={() => setStatus(s)} className="text-xs font-semibold px-3 py-1.5 rounded-full capitalize"
            style={{ background: status === s ? T.ink : T.panel, color: status === s ? "#fff" : T.sub }}>
            {s}
          </button>
        ))}
        <div className="flex-1" />
        <button onClick={() => currentUser ? setShowOrganize(true) : onSignIn()}
          className="text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1" style={{ background: T.signal, color: "#04202A" }}>
          <PartyPopper size={12} /> Organize
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-sm" style={{ color: T.sub }}>Loading events…</div>
      ) : events.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: T.sub }}>
          No {status} events yet — be the first to organize one.
        </div>
      ) : (
        events.map((e) => <EventCard key={e.id} event={e} onRsvp={rsvp} currentUser={currentUser} />)
      )}

      {showOrganize && (
        <EventOrganizeFlow
          currentUser={currentUser}
          onClose={() => setShowOrganize(false)}
          onCreated={(event) => { setShowOrganize(false); setEvents((prev) => status === "upcoming" ? [event, ...prev] : prev); setTicketMsg("Event published! It'll appear under Upcoming."); setTimeout(() => setTicketMsg(""), 4000); }}
        />
      )}
    </div>
  );
}

function AuthModal({ onClose, onAuthed }) {
  const [mode, setMode] = useState("login"); // login | register
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError("");
    if (!email.trim() || !password.trim() || (mode === "register" && !name.trim())) {
      setError("Fill in all fields.");
      return;
    }
    setBusy(true);
    try {
      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const res = await fetch(endpoint, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          mode === "login" ? { email, password } : { email, password, name }
        ),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setError(
          data?.error ||
          `${mode === "login" ? "Sign in" : "Sign up"} failed — server returned ${res.status}. ${res.status === 404 ? "The endpoint may not be deployed yet." : ""}`
        );
        setBusy(false);
        return;
      }
      if (!data?.user) {
        setError("Server responded but sent no user data — check the API response format.");
        setBusy(false);
        return;
      }
      onAuthed(data.user);
    } catch (e) {
      setError(`Couldn't reach the server — ${e.message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,.55)" }}>
      <div className="w-full max-w-sm rounded-2xl p-5" style={{ background: T.bg, border: `1px solid ${T.line}` }}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold" style={{ fontFamily: "Space Grotesk,sans-serif", color: T.ink }}>
            {mode === "login" ? "Sign in to Junction" : "Create your Junction account"}
          </h2>
          <button onClick={onClose}><X size={18} color={T.sub} /></button>
        </div>

        {mode === "register" && (
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name"
            className="w-full mb-2 rounded-lg text-sm px-3 py-2.5"
            style={{ background: T.panel, border: `1px solid ${T.inkLine}`, color: T.ink }} />
        )}
        <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" type="email"
          className="w-full mb-2 rounded-lg text-sm px-3 py-2.5"
          style={{ background: T.panel, border: `1px solid ${T.inkLine}`, color: T.ink }} />
        <input value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" type="password"
          className="w-full mb-3 rounded-lg text-sm px-3 py-2.5"
          style={{ background: T.panel, border: `1px solid ${T.inkLine}`, color: T.ink }} />

        {error && <div className="text-xs mb-3" style={{ color: "#E0554C" }}>{error}</div>}

        <button onClick={submit} disabled={busy}
          className="w-full py-2.5 rounded-lg font-semibold text-sm mb-3"
          style={{ background: T.signal, color: "#04202A", opacity: busy ? 0.6 : 1 }}>
          {busy ? "Please wait…" : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <button onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          className="w-full text-xs font-semibold" style={{ color: T.sub }}>
          {mode === "login" ? "New to Junction? Create an account" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

function ProfileView({ currentUser, properties, services, onSignOut, onSignIn, onGoSettings }) {
  const [joinedCircles, setJoinedCircles] = useState([]);
  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/circles?userId=${currentUser.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setJoinedCircles(data?.circles || []))
      .catch(() => {});
  }, [currentUser?.id]);
  const joinedCircleCodes = joinedCircles.map((c) => c.code);
  if (!currentUser) {
    return (
      <div className="p-6 flex flex-col items-center text-center" style={{ minHeight: "60vh" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
          <UserCheck size={26} color={T.sub} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: T.ink, fontFamily: "Space Grotesk,sans-serif" }}>
          You're not signed in
        </h2>
        <p className="text-sm mb-5 max-w-xs" style={{ color: T.sub }}>
          Sign in to see your profile, your posts, and your Circles.
        </p>
        <button onClick={onSignIn} className="px-6 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: T.signal, color: "#04202A" }}>Sign In</button>
      </div>
    );
  }

  const myProperties = properties.filter((p) => p.isLive && p.ownerId === currentUser.id);
  const myServices = services.filter((s) => s.isLive && s.ownerId === currentUser.id);

  return (
    <div className="p-4 pb-8">
      <div className="flex items-center gap-3 mb-5">
        <div className="w-14 h-14 rounded-full flex items-center justify-center text-lg font-bold"
          style={{ background: T.signal, color: "#04202A" }}>
          {(currentUser.name || "?").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-base font-bold truncate" style={{ color: T.ink }}>{currentUser.name}</div>
          <div className="text-xs truncate" style={{ color: T.sub }}>{currentUser.email}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="p-2.5 rounded-xl text-center" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
          <div className="text-base font-bold" style={{ color: T.ink }}>{myProperties.length}</div>
          <div className="text-[10px]" style={{ color: T.sub }}>Properties</div>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
          <div className="text-base font-bold" style={{ color: T.ink }}>{myServices.length}</div>
          <div className="text-[10px]" style={{ color: T.sub }}>Jobs/Services</div>
        </div>
        <div className="p-2.5 rounded-xl text-center" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
          <div className="text-base font-bold" style={{ color: T.ink }}>{joinedCircleCodes.length}</div>
          <div className="text-[10px]" style={{ color: T.sub }}>Circles</div>
        </div>
      </div>

      {myProperties.length > 0 && (
        <>
          <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Your properties</div>
          <div className="flex flex-col gap-2 mb-5">
            {myProperties.map((p) => (
              <div key={p.id} className="p-3 rounded-xl" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
                <div className="text-sm font-semibold" style={{ color: T.ink }}>{p.title}</div>
                <div className="text-xs" style={{ color: T.sub }}>{p.area} · AED {p.price?.toLocaleString()} · {p.views} views</div>
              </div>
            ))}
          </div>
        </>
      )}

      {myServices.length > 0 && (
        <>
          <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Your jobs/services</div>
          <div className="flex flex-col gap-2 mb-5">
            {myServices.map((s) => (
              <div key={s.id} className="p-3 rounded-xl" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
                <div className="text-sm font-semibold" style={{ color: T.ink }}>{s.name}</div>
                <div className="text-xs" style={{ color: T.sub }}>{s.category} · {s.area}</div>
              </div>
            ))}
          </div>
        </>
      )}

      {myProperties.length === 0 && myServices.length === 0 && (
        <p className="text-xs mb-5" style={{ color: T.sub }}>You haven't posted anything yet.</p>
      )}

      {joinedCircles.length > 0 && (
        <>
          <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Your Circles</div>
          <div className="flex gap-2 flex-wrap mb-5">
            {joinedCircles.map((c) => (
              <div key={c.code} className="text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5"
                style={{ background: T.panel, border: `1px solid ${T.inkLine}`, color: T.ink }}>
                <span>{c.flag}</span>{c.name}
              </div>
            ))}
          </div>
        </>
      )}

      <div className="flex flex-col gap-2">
        <button onClick={onGoSettings} className="w-full text-left text-sm font-semibold px-3 py-2.5 rounded-lg"
          style={{ background: T.panel, color: T.ink, border: `1px solid ${T.inkLine}` }}>
          App settings
        </button>
        <button onClick={onSignOut} className="w-full text-left text-sm font-semibold px-3 py-2.5 rounded-lg"
          style={{ background: T.panel, color: "#E0554C", border: `1px solid ${T.inkLine}` }}>
          Sign out
        </button>
      </div>
    </div>
  );
}

const NAV = [
  { id: "pulse", label: "Pulse", icon: LayoutGrid },
  { id: "souk", label: "Souk", icon: Wrench },
  { id: "investor", label: "Investor zone", icon: Lock },
  { id: "messages", label: "Messages", icon: MessageCircle },
  { id: "community", label: "Community", icon: Users },
  { id: "events", label: "Events", icon: PartyPopper },
  { id: "newcomer", label: "New to UAE", icon: Globe2 },
  { id: "jobs", label: "Junction Work", icon: Briefcase },
  { id: "transactions", label: "Transactions", icon: CreditCard },
  { id: "passport", label: "Passport", icon: UserCheck },
];

// ---------------------------------------------------------------
// SEGMENTED TABS — shared sub-navigation strip used inside the
// consolidated Pulse / Souk / Passport features so each still reads
// as "one feature, a few modes" rather than three hidden screens.
// ---------------------------------------------------------------
function SegmentedTabs({ options, active, onChange, accent = T.signal }) {
  return (
    <div className="flex items-center gap-1.5 px-3 md:px-6 py-2.5 overflow-x-auto sticky top-14 z-10"
      style={{ background: T.paper, borderBottom: `1px solid ${T.line}` }}>
      {options.map((opt) => {
        const Icon = opt.icon;
        const isActive = active === opt.id;
        return (
          <button
            key={opt.id}
            onClick={() => onChange(opt.id)}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full shrink-0 whitespace-nowrap transition-all"
            style={{
              background: isActive ? accent : "#fff",
              color: isActive ? "#04111F" : T.sub,
              border: isActive ? `1px solid ${accent}` : `1px solid ${T.line}`,
            }}
          >
            {Icon && <Icon size={13} />} {opt.label}
            {opt.badge != null && opt.badge > 0 && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: isActive ? "rgba(4,17,31,0.25)" : T.paper, color: isActive ? "#04111F" : T.sub }}>
                {opt.badge}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------
// SOUK — "Build" (services marketplace) and "Business page" used to
// live behind separate nav slots; Souk (Arabic for marketplace — a
// deliberate on-brand nod, same spirit as the Ranches/Gold Souk
// references elsewhere) is where residents both hire help and browse
// the businesses behind those listings, one shared surface.
// ---------------------------------------------------------------
function SoukView({ providers, statuses, properties, onChat, onPublishService }) {
  const [subTab, setSubTab] = useState("services");
  const reelItems = [
    ...(providers || []).map((s) => ({ ...s, kind: "service" })),
    ...JOB_LISTINGS.map((j) => ({ ...j, kind: "job" })),
    ...SEEKER_PROFILES.map((s) => ({ ...s, kind: "seeker" })),
  ];
  return (
    <div>
      <SegmentedTabs
        accent="#1F7A4D"
        active={subTab}
        onChange={setSubTab}
        options={[
          { id: "services", label: "Services", icon: Wrench, badge: providers?.length },
          { id: "reels", label: "Reels", icon: PlayCircle },
          { id: "business", label: "Business Pages", icon: Building2 },
        ]}
      />
      {subTab === "services" && (
        <ServicesView providers={providers} statuses={statuses} onChat={onChat} onPublishService={onPublishService} />
      )}
      {subTab === "reels" && (
        <div style={{ height: "calc(100vh - 180px)" }}>
          <WorkReels items={reelItems} onChat={onChat} onApply={onChat} emptyLabel="No service or job reels yet." />
        </div>
      )}
      {subTab === "business" && <BusinessPageView properties={properties} />}
    </div>
  );
}

// ---------------------------------------------------------------
// PASSPORT — the old Profile / Get Verified / Settings / Sign-in
// entries collapsed into one identity surface. The name is deliberate:
// this is meant to feel like the one document that carries everything
// about a person on Junction — who they are, what's verified, what
// they've posted, and how the app behaves for them.
// ---------------------------------------------------------------
// ---------------------------------------------------------------
// JUNCTION ID — every registered user gets a handle of the form
// firstlast@junction.com. This is what identifies them across Connect,
// @mentions, and (once junction.com's MX records point at an inbound
// mail webhook) real email sent to that address landing straight in
// their Connect inbox. Client-side we derive it deterministically so
// it's stable and predictable; the backend should assign/reserve the
// canonical version at registration to guarantee no collisions.
// ---------------------------------------------------------------
function generateJunctionId(name, fallbackSeed) {
  if (!name) return fallbackSeed ? `user${String(fallbackSeed).slice(-6)}@junction.com` : "user@junction.com";
  const clean = name
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .split(/\s+/);
  if (clean.length === 0 || !clean[0]) return fallbackSeed ? `user${String(fallbackSeed).slice(-6)}@junction.com` : "user@junction.com";
  const first = clean[0];
  const last = clean.length > 1 ? clean[clean.length - 1] : "";
  const handle = (first + last).slice(0, 24) || first;
  return `${handle}@junction.com`;
}

function PassportView({ currentUser, properties, services, statuses, setStatuses, settings, setSettings, onSignOut, onSignIn, onUserUpdated }) {
  const [subTab, setSubTab] = useState("overview");
  const [joinedCircles, setJoinedCircles] = useState([]);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(currentUser?.name || "");
  const [editBio, setEditBio] = useState(currentUser?.bio || "");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");
  const avatarInputRef = useRef(null);
  const [switchingTier, setSwitchingTier] = useState(false);

  useEffect(() => {
    if (!currentUser?.id) return;
    fetch(`/api/circles?userId=${currentUser.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setJoinedCircles(data?.circles || []))
      .catch(() => {});
  }, [currentUser?.id]);

  const patchUser = async (fields) => {
    if (!currentUser?.id) return;
    try {
      const res = await fetch("/api/people?action=profile", {
        method: "PATCH", credentials: "include", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...fields }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setSaveMsg(`Didn't save — ${data?.error || res.status}. Your Passport backend may need the users table columns added (see /api/people.js comments).`);
        return null;
      }
      const u = data.user || {};
      onUserUpdated?.({
        name: u.name, bio: u.bio, junctionId: u.junction_id,
        avatarUrl: u.avatar_url, backgroundId: u.background_id,
        passportTier: u.passport_tier, roleLabel: u.role_label,
      });
      setSaveMsg("Saved ✓");
      setTimeout(() => setSaveMsg(""), 2500);
      return data.user;
    } catch (e) {
      setSaveMsg(`Couldn't reach the server — ${e.message}`);
      return null;
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    await patchUser({ name: editName.trim(), bio: editBio.trim() });
    setSaving(false);
    setEditing(false);
  };

  const applyBackground = (bgId) => patchUser({ backgroundId: bgId });

  const uploadAvatar = async (file) => {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", "avatars");
    setSaving(true);
    try {
      const res = await fetch("/api/people?action=upload", { method: "POST", credentials: "include", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      await patchUser({ avatarUrl: data.url });
    } catch (e) {
      setSaveMsg(`Photo didn't upload — ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const switchTier = async (tierId) => {
    setSwitchingTier(true);
    await patchUser({ passportTier: tierId });
    setSwitchingTier(false);
  };

  if (!currentUser) {
    return (
      <div className="p-6 flex flex-col items-center text-center" style={{ minHeight: "70vh" }}>
        <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
          <UserCheck size={26} color={T.sub} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: T.ink, fontFamily: "Space Grotesk,sans-serif" }}>
          Your Passport isn't set up yet
        </h2>
        <p className="text-sm mb-5 max-w-xs" style={{ color: T.sub }}>
          Sign in to see your identity, verification status, listings, Circles, and settings — all in one place.
        </p>
        <button onClick={onSignIn} className="px-6 py-2.5 rounded-xl font-semibold text-sm"
          style={{ background: T.signal, color: "#04202A" }}>Sign In</button>
      </div>
    );
  }

  const myProperties = properties.filter((p) => p.isLive && p.ownerId === currentUser.id);
  const myServices = services.filter((s) => s.isLive && s.ownerId === currentUser.id);
  const junctionId = currentUser.junctionId || generateJunctionId(currentUser.name, currentUser.id);
  const verifiedCount = VERIFICATION_TIERS.filter((t) => statuses[t.type] === "verified").length;
  const pendingCount = VERIFICATION_TIERS.filter((t) => statuses[t.type] === "pending").length;
  const trustLevel = verifiedCount === VERIFICATION_TIERS.length ? "Fully verified"
    : verifiedCount > 0 ? "Partially verified"
    : pendingCount > 0 ? "Verification pending" : "Not verified";
  const trustColor = verifiedCount === VERIFICATION_TIERS.length ? "#1F7A4D"
    : verifiedCount > 0 || pendingCount > 0 ? "#9A6B17" : T.sub;

  const advanceVerification = (type) => {
    setStatuses((prev) => {
      const cur = prev[type] || "none";
      const next = cur === "none" ? "pending" : cur === "pending" ? "verified" : "verified";
      return { ...prev, [type]: next };
    });
  };

  const tier = PASSPORT_TIERS[passportTierOf(currentUser)];
  const bg = BACKGROUND_PRESETS.find((b) => b.id === currentUser.backgroundId) || BACKGROUND_PRESETS[0];

  return (
    <div>
      {/* Identity header — always visible regardless of sub-tab */}
      <div className="p-4 md:p-6" style={{ background: bg.css }}>
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <button onClick={() => avatarInputRef.current?.click()} className="block">
              <PassportAvatar user={currentUser} size={64} />
            </button>
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(f); e.target.value = ""; }} />
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
              style={{ background: "#fff", border: `1px solid ${T.line}` }}>
              <Upload size={9} style={{ color: T.navy }} />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <input value={editName} onChange={(e) => setEditName(e.target.value)}
                  className="text-sm font-bold px-2 py-1.5 rounded-lg outline-none" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} placeholder="Your name" />
                <input value={editBio} onChange={(e) => setEditBio(e.target.value)}
                  className="text-xs px-2 py-1.5 rounded-lg outline-none" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }} placeholder="Short bio (e.g. 'RERA agent, Dubai Marina specialist')" />
                <div className="flex gap-2 mt-0.5">
                  <button onClick={saveProfile} disabled={saving} className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: T.signal, color: "#04202A" }}>{saving ? "Saving…" : "Save"}</button>
                  <button onClick={() => setEditing(false)} className="text-[11px] font-semibold px-3 py-1.5 rounded-lg" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="text-base font-bold truncate" style={{ color: "#fff", fontFamily: "'Space Grotesk',sans-serif" }}>
                    {currentUser.name}
                  </div>
                  <button onClick={() => { setEditName(currentUser.name || ""); setEditBio(currentUser.bio || ""); setEditing(true); }}
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>
                    Edit
                  </button>
                </div>
                {currentUser.bio && <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.75)" }}>{currentUser.bio}</div>}
              </>
            )}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"
                style={{ background: `${tier.color}33`, color: "#fff", border: `1px solid ${tier.color}` }}>
                <ShieldCheck size={10} /> {tier.name}
              </span>
              <button
                onClick={() => { navigator.clipboard?.writeText(junctionId); }}
                className="text-[10px] font-semibold px-2 py-0.5 rounded-full inline-flex items-center gap-1"
                style={{ background: "rgba(0,207,255,0.2)", color: "#00CFFF" }}
                title="Tap to copy your Junction ID"
              >
                <AtSign size={10} /> {junctionId}
              </button>
            </div>
            {saveMsg && <div className="text-[10px] mt-1" style={{ color: saveMsg.startsWith("Saved") ? "#7FE0A8" : "#FFB4B4" }}>{saveMsg}</div>}
          </div>
        </div>
        <div className="flex gap-1.5 mt-3">
          {BACKGROUND_PRESETS.map((b) => (
            <button key={b.id} onClick={() => applyBackground(b.id)} title={b.name}
              className="w-6 h-6 rounded-full shrink-0" style={{ background: b.swatch, border: currentUser.backgroundId === b.id ? "2px solid #fff" : "2px solid rgba(255,255,255,0.3)" }} />
          ))}
        </div>
      </div>

      <SegmentedTabs
        accent={T.signal}
        active={subTab}
        onChange={setSubTab}
        options={[
          { id: "overview", label: "Overview", icon: UserCheck },
          { id: "listings", label: "My Listings", icon: LayoutGrid, badge: myProperties.length + myServices.length },
          { id: "verify", label: "Verification", icon: ShieldCheck, badge: pendingCount },
          { id: "tier", label: "Passport Tier", icon: Crown },
          { id: "settings", label: "Settings", icon: Settings },
        ]}
      />

      {subTab === "tier" && (
        <div className="p-4 md:p-6">
          <p className="text-sm mb-1 max-w-2xl" style={{ color: T.ink }}>
            <b>Three real access levels</b> — not just badges. Each one actually unlocks different parts of Junction.
          </p>
          <p className="text-xs mb-5 max-w-2xl" style={{ color: T.sub }}>
            Billing isn't connected yet, so switching tiers here is free for now — useful to try out what each
            level unlocks. Once payments are wired, this becomes a real subscription.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {Object.values(PASSPORT_TIERS).map((t) => {
              const isCurrent = passportTierOf(currentUser) === t.id;
              return (
                <div key={t.id} className="rounded-2xl p-4 border flex flex-col gap-3"
                  style={{ borderColor: isCurrent ? t.color : T.line, borderWidth: isCurrent ? 2 : 1, background: "#fff" }}>
                  <div>
                    <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: T.ink }}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: t.color }} />
                      {t.name}
                    </div>
                    <div className="text-xl font-bold mt-1" style={{ color: T.ink, fontFamily: "'Space Grotesk',sans-serif" }}>
                      {t.price}<span className="text-xs font-normal" style={{ color: T.sub }}>{t.priceNote}</span>
                    </div>
                    <p className="text-[11px] mt-1" style={{ color: T.sub }}>{t.tagline}</p>
                  </div>
                  <ul className="text-xs flex flex-col gap-1.5 flex-1">
                    {t.features.map((f, i) => (
                      <li key={i} className="flex items-start gap-1.5" style={{ color: T.ink }}>
                        <CheckCircle2 size={13} style={{ color: t.color, marginTop: 1, flexShrink: 0 }} /> {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent || switchingTier}
                    onClick={() => switchTier(t.id)}
                    className="text-xs font-bold py-2.5 rounded-xl"
                    style={{ background: isCurrent ? T.panel : t.color, color: isCurrent ? T.sub : "#fff" }}
                  >
                    {isCurrent ? "Current Passport" : switchingTier ? "Switching…" : `Switch to ${t.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {subTab === "overview" && (
        <div className="p-4 pb-8">
          <div className="grid grid-cols-3 gap-2 mb-5">
            <div className="p-2.5 rounded-xl text-center" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
              <div className="text-base font-bold" style={{ color: T.ink }}>{myProperties.length}</div>
              <div className="text-[10px]" style={{ color: T.sub }}>Properties</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
              <div className="text-base font-bold" style={{ color: T.ink }}>{myServices.length}</div>
              <div className="text-[10px]" style={{ color: T.sub }}>Jobs/Services</div>
            </div>
            <div className="p-2.5 rounded-xl text-center" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
              <div className="text-base font-bold" style={{ color: T.ink }}>{joinedCircles.length}</div>
              <div className="text-[10px]" style={{ color: T.sub }}>Circles</div>
            </div>
          </div>

          <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Verification status</div>
          <div className="flex flex-wrap gap-2 mb-5">
            {VERIFICATION_TIERS.map((t) => {
              const s = statuses[t.type] || "none";
              const color = s === "verified" ? "#1F7A4D" : s === "pending" ? "#9A6B17" : T.sub;
              return (
                <span key={t.type} className="text-[11px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: `${color}18`, color }}>
                  {t.title}: {s === "verified" ? "Verified" : s === "pending" ? "Pending" : "Not started"}
                </span>
              );
            })}
          </div>

          {joinedCircles.length > 0 && (
            <>
              <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Your Circles</div>
              <div className="flex gap-2 flex-wrap mb-5">
                {joinedCircles.map((c) => (
                  <div key={c.code} className="text-xs px-2.5 py-1.5 rounded-full flex items-center gap-1.5"
                    style={{ background: T.panel, border: `1px solid ${T.inkLine}`, color: T.ink }}>
                    <span>{c.flag}</span>{c.name}
                  </div>
                ))}
              </div>
            </>
          )}

          <button onClick={onSignOut} className="w-full text-left text-sm font-semibold px-3 py-2.5 rounded-lg"
            style={{ background: T.panel, color: "#E0554C", border: `1px solid ${T.inkLine}` }}>
            Sign out
          </button>
        </div>
      )}

      {subTab === "listings" && (
        <div className="p-4 pb-8">
          {myProperties.length > 0 && (
            <>
              <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Your properties</div>
              <div className="flex flex-col gap-2 mb-5">
                {myProperties.map((p) => (
                  <div key={p.id} className="p-3 rounded-xl" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
                    <div className="text-sm font-semibold" style={{ color: T.ink }}>{p.title}</div>
                    <div className="text-xs" style={{ color: T.sub }}>{p.area} · AED {p.price?.toLocaleString()} · {p.views} views</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {myServices.length > 0 && (
            <>
              <div className="text-xs font-semibold mb-2" style={{ color: T.sub }}>Your jobs/services</div>
              <div className="flex flex-col gap-2 mb-5">
                {myServices.map((s) => (
                  <div key={s.id} className="p-3 rounded-xl" style={{ background: T.panel, border: `1px solid ${T.inkLine}` }}>
                    <div className="text-sm font-semibold" style={{ color: T.ink }}>{s.name}</div>
                    <div className="text-xs" style={{ color: T.sub }}>{s.category} · {s.area}</div>
                  </div>
                ))}
              </div>
            </>
          )}
          {myProperties.length === 0 && myServices.length === 0 && (
            <p className="text-xs" style={{ color: T.sub }}>You haven't posted anything yet — post a property or a service from the "+ Post" button up top.</p>
          )}
        </div>
      )}

      {subTab === "verify" && (
        <div className="p-4 md:p-6">
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
                      onClick={() => advanceVerification(tier.type)}
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
      )}

      {subTab === "settings" && <SettingsView settings={settings} setSettings={setSettings} />}
    </div>
  );
}

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

// A real face silhouette (frontal, low-poly proportions: brow, temples,
// cheekbones, jaw, chin) — not traced from any photo, just standard face
// proportions so shards converge into something that actually reads as a face.
const FACE_POLY = [
  [145, 50], [172, 53], [195, 65], [214, 88], [225, 118], [230, 148],
  [227, 180], [219, 210], [204, 240], [183, 268], [163, 292], [145, 322],
  [127, 292], [107, 268], [86, 240], [71, 210], [63, 180], [60, 148],
  [65, 118], [76, 88], [95, 65], [118, 53],
];

function pointInPolygon(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

function smoothClosedPath(pts) {
  const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  let start = mid(pts[0], pts[pts.length - 1]);
  let d = `M ${start[0]} ${start[1]}`;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const next = pts[(i + 1) % pts.length];
    const m = mid(p, next);
    d += ` Q ${p[0]} ${p[1]} ${m[0]} ${m[1]}`;
  }
  return d + " Z";
}
const FACE_POLY_PATH = smoothClosedPath(FACE_POLY);

// Low-poly shard particles — scattered triangular fragments that fly inward
// and converge to form the face silhouette, like a shattered mesh reassembling.
// Each shard travels along the straight radial line from the face's center
// through its own home point — an organized inward collapse, not random confetti.
const FACE_CENTER = [145, 186];
const JUNCTION_WORDS = [
  "REAL ESTATE", "JOBS", "SERVICES", "TRUSTED", "VERIFIED", "JUNCTION",
  "INVESTORS", "IDENTITY", "UAE", "PROPERTY", "TALENT", "BUSINESS",
  "PRIVATE LAYER", "CHECKED", "PROFESSIONALS", "DEVELOPERS", "SECURE",
  "NETWORK", "CAREERS", "REAL", "EVERY ENTITY",
];
const FACE_SHARDS = Array.from({ length: 85 }, () => {
  let fx, fy;
  do {
    fx = 60 + Math.random() * 170;
    fy = 50 + Math.random() * 272;
  } while (!pointInPolygon(fx, fy, FACE_POLY));
  const dx = fx - FACE_CENTER[0], dy = fy - FACE_CENTER[1];
  const rlen = Math.hypot(dx, dy) || 1;
  const dist = 90 + Math.random() * 220; // travel distance along its own radial line
  const sx = (dx / rlen) * dist;
  const sy = (dy / rlen) * dist;
  const sz = -40 - Math.random() * 140; // start further back in Z for a 3D fly-in
  const srot = Math.random() * 90 - 45;
  const word = JUNCTION_WORDS[Math.floor(Math.random() * JUNCTION_WORDS.length)];
  const fontSize = 4.2 + Math.random() * 2.4;
  const op = 0.4 + Math.random() * 0.55;
  // simple lighting: upper-right is the lit side, lower-left is shadow —
  // same light logic as the reference shard face
  const lit = (fx - 60) / 170 * 0.6 + (1 - (fy - 50) / 272) * 0.4;
  const r = Math.random();
  const fill = r < 0.1 && lit > 0.6 ? "#EAFBFF" : lit > 0.55 ? "#00CFFF" : lit > 0.3 ? "#3A7A9A" : "#0A3050";
  const t = Math.min(1, dist / 310);
  const delay = t * 7.2 + Math.random() * 0.6;
  const dur = 0.9 + Math.random() * 0.7;
  return { fx, fy, sx, sy, sz, srot, word, fontSize, op, fill, delay, dur };
});

function IntroScreen({ onEnter, userName }) {
  const [query, setQuery] = useState("");
  const [closing, setClosing] = useState(false);
  const [tick, setTick] = useState(0);
  const [stage, setStage] = useState("tap"); // "tap" | "face"
  const [assembling, setAssembling] = useState(false); // true during the ~1.3s construction sequence
  const [speaking, setSpeaking] = useState(false);
  const [mouthOpen, setMouthOpen] = useState(false);
  const [welcomeText, setWelcomeText] = useState("");

  const welcomeMsg = userName
    ? `${userName}, welcome back. I am Junction AI — your gateway to the UAE hub for real estate, professional services, investors and developers.`
    : `Welcome to Junction — the connecting infrastructure of UAE real estate. You are not a user here. You are a citizen. Every listing, every service, every investor opportunity is visible to the entire world through Junction. Tap to enter and explore.`;

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
    setAssembling(true);
    const beginSpeech = () => {
      setAssembling(false);
      if (!window.speechSynthesis) return;
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(welcomeMsg);
      utter.rate = 0.92;
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
    };
    // Stage 2: the face constructs itself from circuit traces before it speaks —
    // ring draws in, traces draw in, features pop in, logo completes the circuit last.
    setTimeout(beginSpeech, 10000);
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
            THE PRIVATE LAYER OF TRUST<br/>
            BUILT FOR THE UAE
          </div>

          {/* Vision statement */}
          <p className="max-w-xs text-sm" style={{ color: "#5A9AAA", lineHeight: "1.7",
            fontFamily: "IBM Plex Mono,monospace", fontSize: "11px" }}>
            Every entity, checked. Every identity, verified. Before you deal with
            anyone in the UAE, Junction already knows if they're real.
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
                TAP TO<br/>CONNECT
              </div>
            </div>
            <p style={{ color: "#1A5A70", fontSize: "10px",
              fontFamily: "IBM Plex Mono,monospace", letterSpacing: ".08em" }}>
              JUNCTION AI IS READY
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
        {/* LOGO above face — completes the circuit last, once the face has assembled */}
        <div className="flex items-center gap-3 mb-3"
          style={{ animation: assembling
            ? "none"
            : "logoCompleteIn .6s ease-out both, logoCoreGlow 2.4s ease-in-out .6s infinite",
            opacity: assembling ? 0 : 1 }}>
          <JunctionLogoMark size={40} glow />
          <h1 style={{ fontFamily: "Space Grotesk,sans-serif", color: "#00CFFF",
            textShadow: "0 0 24px #00CFFF99, 0 0 48px #00CFFF44",
            letterSpacing: ".12em", fontSize: "28px", fontWeight: 800 }}>
            JUNCTION
          </h1>
        </div>

        {/* THE NEURAL FACE — constructs itself from scattered word-shards, turning into view in 3D */}
        <div style={{ perspective: "1100px", perspectiveOrigin: "50% 40%" }}>
          <svg width="250" height="300" viewBox="0 0 290 360"
            style={{ animation: "faceTurn3D 1.4s cubic-bezier(.2,.7,.15,1) both",
              transformStyle: "preserve-3d" }}>
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

          <path d={FACE_POLY_PATH} fill="url(#faceG)"
            style={{ animation: assembling ? "faceFeatureIn 3.5s .6s ease-out both" : "none" }}/>
          <path d={FACE_POLY_PATH} fill="none"
            stroke="#00CFFF" strokeWidth="1.3" strokeOpacity=".8" filter="url(#glow2)"
            strokeDasharray="900" style={{ animation: assembling ? "faceRingDraw 4.5s ease-out both" : "none" }}/>

          {/* circuit lines — draw in once, then settle into their idle pulse */}
          <line x1="145" y1="36" x2="145" y2="94" stroke="#00CFFF" strokeWidth=".9"
            strokeOpacity=".7" strokeDasharray="120"
            style={{ animation: assembling
              ? "faceTraceDraw 1.3s 5.6s ease-out both"
              : "circuitFlow 3.2s ease-in-out infinite" }}/>
          <path d="M84 72 L108 64 L145 62 L182 64 L206 72" stroke="#00CFFF"
            strokeWidth=".8" strokeOpacity=".55" fill="none" strokeDasharray="160"
            style={{ animation: assembling
              ? "faceTraceDraw 1.4s 6.1s ease-out both"
              : "circuitFlow 4s ease-in-out .6s infinite" }}/>
          <path d="M38 148 L54 156 L58 184 L50 220 L40 252" stroke="#00CFFF"
            strokeWidth=".8" strokeOpacity=".5" fill="none" strokeDasharray="140"
            style={{ animation: assembling
              ? "faceTraceDraw 1.4s 6.6s ease-out both"
              : "circuitFlow 5.5s ease-in-out 1s infinite" }}/>
          <path d="M252 148 L236 156 L232 184 L240 220 L250 252" stroke="#00CFFF"
            strokeWidth=".8" strokeOpacity=".5" fill="none" strokeDasharray="140"
            style={{ animation: assembling
              ? "faceTraceDraw 1.4s 6.6s ease-out both"
              : "circuitFlow 5.5s ease-in-out 2s infinite" }}/>

          {/* word shards — Junction's own vocabulary flies in and converges to form the face */}
          <g filter="url(#glow2)">
            {FACE_SHARDS.map((s, i) => (
              <text key={i}
                x={s.fx} y={s.fy}
                fontFamily="'IBM Plex Mono',monospace" fontSize={s.fontSize}
                fill={s.fill} textAnchor="middle" style={{ userSelect: "none",
                  "--sx": `${s.sx}px`, "--sy": `${s.sy}px`, "--sz": `${s.sz}px`, "--srot": `${s.srot}deg`, "--op": s.op,
                  transformOrigin: `${s.fx}px ${s.fy}px`,
                  opacity: assembling ? 0 : s.op,
                  transform: assembling ? undefined : "translate3d(0,0,0) rotate(0deg) scale(1)",
                  animation: assembling
                    ? `particleConverge ${s.dur}s ${s.delay}s cubic-bezier(.16,.9,.3,1) both`
                    : "none",
                }}>{s.word}</text>
            ))}
          </g>

          {/* energy burst — fires once, right as the assembly locks into place */}
          {assembling && (
            <ellipse cx="145" cy="186" rx="115" ry="165" fill="none" stroke="#00CFFF"
              style={{ animation: "energyBurst .7s 8.1s ease-out both" }}/>
          )}

          {/* sensor dots */}
          {[[54,164],[236,164],[52,208],[238,208]].map(([cx,cy],i) => (
            <circle key={i} cx={cx} cy={cy} r="3.2" fill="#00CFFF"
              style={{ animation: assembling
                ? `faceFeatureIn .5s ${8.4 + i*.3}s ease-out both`
                : `neuralPulse ${2+i*.45}s ease-in-out ${i*.3}s infinite`,
                filter: "drop-shadow(0 0 5px #00CFFF)" }}/>
          ))}

          {/* eyebrows */}
          <path d="M74 138 Q98 126 126 134" stroke="#00CFFF" strokeWidth="2"
            fill="none" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px #00CFFF)" }}/>
          <path d="M164 134 Q192 126 216 138" stroke="#00CFFF" strokeWidth="2"
            fill="none" strokeLinecap="round"
            style={{ filter: "drop-shadow(0 0 3px #00CFFF)" }}/>

          {/* eyes — almond-shaped with an eyelid crease, not circular */}
          <g style={{ animation: "aiBlink 6s infinite", transformOrigin: "100px 160px" }}>
            <path d="M72 160 Q88 145 102 147 Q118 149 130 160 Q118 173 102 175 Q88 174 72 160 Z" fill="#041020"/>
            <circle cx="102" cy="160" r="11" fill="url(#eyeGL)"
              style={{ animation: "eyeGlow 3s ease-in-out infinite" }}/>
            <circle cx="102" cy="160" r="4.5" fill="#000820"/>
            <circle cx="98" cy="156" r="2.4" fill="#fff" opacity=".88"/>
            <path d="M72 160 Q88 145 102 147 Q118 149 130 160" fill="none"
              stroke="#00CFFF" strokeWidth=".9" strokeOpacity=".8"/>
            <path d="M76 163 Q90 172 102 173 Q116 172 126 162" fill="none"
              stroke="#00CFFF" strokeWidth=".5" strokeOpacity=".4"/>
          </g>
          <g style={{ animation: "aiBlink 6s infinite", transformOrigin: "188px 160px" }}>
            <path d="M160 160 Q172 149 188 147 Q202 145 218 160 Q202 174 188 175 Q172 173 160 160 Z" fill="#041020"/>
            <circle cx="188" cy="160" r="11" fill="url(#eyeGR)"
              style={{ animation: "eyeGlow 3s ease-in-out .5s infinite" }}/>
            <circle cx="188" cy="160" r="4.5" fill="#000820"/>
            <circle cx="184" cy="156" r="2.4" fill="#fff" opacity=".88"/>
            <path d="M160 160 Q172 149 188 147 Q202 145 218 160" fill="none"
              stroke="#00CFFF" strokeWidth=".9" strokeOpacity=".8"/>
            <path d="M164 162 Q174 172 188 173 Q202 172 214 163" fill="none"
              stroke="#00CFFF" strokeWidth=".5" strokeOpacity=".4"/>
          </g>

          {/* nose — bridge, tip, and nostrils */}
          <path d="M145 178 L137 232 Q145 242 153 232" stroke="#00CFFF"
            strokeWidth="1" strokeOpacity=".45" fill="none" strokeLinecap="round"/>
          <ellipse cx="136" cy="235" rx="3.2" ry="2" fill="#00CFFF" opacity=".3"/>
          <ellipse cx="154" cy="235" rx="3.2" ry="2" fill="#00CFFF" opacity=".3"/>
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
        </div>

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

        {/* AI matching input */}
        <div className="w-full max-w-xs flex flex-col gap-2.5">
          <div className="text-center text-[10px] mb-1"
            style={{ color:"#1A5A70", fontFamily:"IBM Plex Mono,monospace", letterSpacing:".08em" }}>
            TELL JUNCTION AI WHAT YOU NEED
          </div>
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(0,207,255,0.06)", border: "1px solid #00CFFF33" }}>
            <Sparkles size={14} style={{ color: "#00CFFF" }}/>
            <input value={query} onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === "Enter" && enter(query)}
              placeholder="e.g. 2BR villa in Dubai Marina under 2M…"
              className="text-sm outline-none flex-1 bg-transparent"
              style={{ color: "#B8EEFF", fontFamily: "IBM Plex Mono,monospace" }}/>
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {["Studio in JBR", "Office in Business Bay", "Villa for investment"].map(s => (
              <button key={s} onClick={() => enter(s)}
                className="text-[10px] px-2.5 py-1 rounded-full"
                style={{ background:"rgba(0,207,255,0.08)", color:"#4AAFCC",
                  border:"1px solid #00CFFF22", fontFamily:"IBM Plex Mono,monospace" }}>
                {s}
              </button>
            ))}
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



// ---------------------------------------------------------------
// ErrorBoundary — a single crashed tab/component should never blank
// the whole app. Catches render errors and shows a recoverable
// screen instead of a white page.
// ---------------------------------------------------------------
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("Junction crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="p-6 flex flex-col items-center justify-center text-center" style={{ minHeight: "70vh" }}>
          <h2 style={{ fontFamily: "'Space Grotesk', sans-serif" }} className="text-xl font-semibold mb-2">
            Something went wrong on this screen
          </h2>
          <p className="text-sm mb-4" style={{ color: "#7A8288", maxWidth: 420 }}>
            {String(this.state.error.message || this.state.error)}
          </p>
          <button
            onClick={() => this.setState({ error: null })}
            className="text-sm font-semibold px-4 py-2 rounded-lg"
            style={{ background: "#14191F", color: "#fff" }}
          >
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function AppInner() {
  const [tab, setTab] = useState("pulse");
  const [pulseSubTab, setPulseSubTab] = useState("feed"); // "feed" | "reels" | "stats"
  const [showPostModal, setShowPostModal] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [verifyStatuses, setVerifyStatuses] = useState({});
  const [properties, setProperties] = useState(PROPERTIES);
  const [services, setServices] = useState(SERVICE_PROVIDERS);
  // Investor Zone access now comes from currentUser.passportTier (see hasAccess), not local state.
  const [loadError, setLoadError] = useState(null);

  // Pull real, database-backed properties on load and merge them in ahead
  // of the mock set. Any failure is now surfaced via loadError instead of
  // silently vanishing — that silence was exactly what made real posts
  // look like they'd disappeared.
  useEffect(() => {
    fetch("/api/properties")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `properties fetch failed (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.properties?.length) return;
        const real = data.properties.map((p) => ({
          id: `db-${p.id}`,
          title: p.title,
          area: p.area,
          emirate: p.emirate,
          type: "Apartment",
          category: "residential",
          price: Number(p.price),
          priceFreq: "sale",
          beds: p.beds,
          baths: p.baths,
          sqft: p.sqft,
          views: p.views || 0,
          visibility: "public",
          status: "active",
          grad: ["#3A6FA0", "#1F3D5C"],
          listingChain: [],
          isLive: true,
          ownerId: p.owner_id || null,
        }));
        setProperties((prev) => [...real, ...prev]);
      })
      .catch((e) => setLoadError(`Couldn't load saved properties — ${e.message}`));

    fetch("/api/services")
      .then(async (r) => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `services fetch failed (${r.status})`);
        }
        return r.json();
      })
      .then((data) => {
        if (!data?.services?.length) return;
        const real = data.services.map((s) => ({
          id: `db-${s.id}`,
          name: s.title,
          category: s.category,
          emirate: "Dubai",
          area: s.area || "UAE",
          rating: 5.0,
          jobsCompleted: 0,
          online: true,
          rate: s.price_text || "Contact for rate",
          grad: ["#3A6FA0", "#1F3D5C"],
          isLive: true,
          ownerId: s.owner_id || null,
        }));
        setServices((prev) => [...real, ...prev]);
      })
      .catch((e) => setLoadError((prev) => prev || `Couldn't load saved services — ${e.message}`));
  }, []);

  const [settings, setSettings] = useState(() => ({
    theme: "light",
    notifications: true,
    textSize: "md",
    language: detectLanguage(),
  }));

  // Skip the intro on reload within the same browser tab/session — once a
  // visitor has entered, refreshing the page keeps them in the main app
  // instead of replaying the welcome screen every time. (Closing the tab
  // and opening a fresh one will show the intro again, which is expected
  // — there's no backend yet to remember visitors across devices/sessions.)
  const [phase, setPhase] = useState(() => {
    try {
      return sessionStorage.getItem("junction_entered") === "1" ? "main" : "intro";
    } catch {
      return "intro";
    }
  });
  const [aiAutoQuery, setAiAutoQuery] = useState(null);

  // Demo user — in production this comes from auth (JWT / session)
  // Change this to null to see the "new visitor" welcome message
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("junction_user") || "null"); }
    catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const handleAuthed = (user) => {
    setCurrentUser(user);
    localStorage.setItem("junction_user", JSON.stringify(user));
    setShowAuthModal(false);
  };
  const handleSignOut = () => {
    setCurrentUser(null);
    localStorage.removeItem("junction_user");
    fetch("/api/auth/login", { method: "DELETE", credentials: "include" }).catch(() => {});
  };
  const handleUserUpdated = (updatedFields) => {
    setCurrentUser((prev) => {
      const next = { ...prev, ...updatedFields };
      localStorage.setItem("junction_user", JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    if (!currentUser?.id) { setUnreadCount(0); return; }
    const poll = () => fetch("/api/conversations?action=unread-count", { credentials: "include" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setUnreadCount(data.count || 0))
      .catch(() => {});
    poll();
    const id = setInterval(poll, 20000);
    return () => clearInterval(id);
  }, [currentUser?.id]);

  const initialViews = useMemo(
    () => Object.fromEntries(PROPERTIES.map((p) => [p.id, p.views])),
    []
  );
  const liveViews = useLiveViews(initialViews);

  // Shared by the manual "Post a property" form AND the AI draft-posting flow.
  // Returns a promise so callers can show a real success/failure result
  // instead of silently losing the post if the save actually fails.
  const publishPropertyDraft = async (newProperty) => {
    const withDefaults = { ...newProperty, isLive: true, ownerId: currentUser?.id || null };
    setProperties((prev) => [withDefaults, ...prev]);
    try {
      const res = await fetch("/api/properties", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newProperty.title,
          area: newProperty.area,
          emirate: newProperty.emirate,
          price: newProperty.price,
          beds: newProperty.beds,
          baths: newProperty.baths,
          sqft: newProperty.sqft,
          furnished: newProperty.furnished,
          serviceCharge: newProperty.serviceCharge,
          description: newProperty.description,
          ownerId: currentUser?.id || null,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        return { success: false, error: data?.error || `Server returned ${res.status}` };
      }
      // The database is the source of truth for IDs — swap our temporary
      // local one for the real one now, so editing this listing works
      // immediately instead of needing a page reload first.
      if (data?.property?.id) {
        const realId = `db-${data.property.id}`;
        setProperties((prev) => prev.map((p) => (p.id === withDefaults.id ? { ...p, id: realId } : p)));
      }
      return { success: true };
    } catch (e) {
      return { success: false, error: `Couldn't reach the server — ${e.message}. It's showing locally but won't survive a refresh until this is fixed.` };
    }
  };

  const handlePublish = async (newProperty) => {
    setShowPostModal(false);
    setTab("pulse");
    setPulseSubTab("feed");
    const result = await publishPropertyDraft(newProperty);
    if (!result.success) {
      alert(`Heads up — this listing didn't save to the database: ${result.error}`);
    }
  };

  if (phase === "intro") {
    return (
      <>
        <style>{FONT_IMPORT}</style>
        <IntroScreen
          userName={currentUser?.name || null}
          onEnter={(q) => {
            if (q && q.trim()) setAiAutoQuery(q.trim());
            try { sessionStorage.setItem("junction_entered", "1"); } catch {}
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
        className="relative flex items-center justify-between gap-2 px-3 md:px-6 py-3 sticky top-0 z-20"
        style={{ background: "#020D1A", borderBottom: "1px solid #00CFFF18" }}
      >
        <div className="shrink-0">
          <Logo light />
        </div>
        <nav className="hidden md:flex items-center gap-1 overflow-x-auto">
          {NAV.map((n) => {
            const Icon = n.icon;
            const isActive = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg shrink-0"
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
        <div className="flex items-center gap-1.5 md:gap-2 shrink-0">
          {currentUser ? (
            <button onClick={handleSignOut} title="Sign out"
              className="hidden lg:flex items-center gap-1.5 text-xs font-medium px-2.5 py-1.5 rounded-lg shrink-0"
              style={{ background: "rgba(0,207,255,0.08)", color: "#00CFFF",
                border: "1px solid #00CFFF22", fontFamily: "'IBM Plex Mono',monospace" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2DBD8A",
                display: "inline-block", boxShadow: "0 0 6px #2DBD8A" }}/>
              {currentUser.name}
            </button>
          ) : (
            <button onClick={() => setShowAuthModal(true)}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg shrink-0"
              style={{ background: "#00CFFF", color: "#04202A" }}>
              Sign In
            </button>
          )}
          <button
            onClick={() => { setShowNotifications((s) => !s); }}
            title="Notifications"
            className="relative w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
            style={{ background: "rgba(0,207,255,0.08)", border: "1px solid #00CFFF22" }}
          >
            <Bell size={15} style={{ color: "#00CFFF" }} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[9px] font-bold w-4 h-4 rounded-full flex items-center justify-center"
                style={{ background: "#E0554C", color: "#fff" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {tab === "pulse" && (
            <button
              onClick={() => setShowPostModal(true)}
              className="text-[11px] md:text-xs font-bold px-2.5 md:px-3 py-1.5 rounded-lg shrink-0 whitespace-nowrap"
              style={{ background: "linear-gradient(135deg,#00CFFF,#5B9EFF)", color: "#04111F",
                fontFamily: "'Space Grotesk',sans-serif",
                boxShadow: "0 0 14px rgba(0,207,255,.4)" }}
            >
              <span className="md:hidden">+ Post</span>
              <span className="hidden md:inline">Post a property</span>
            </button>
          )}
        </div>
        {showNotifications && (
          <div className="absolute right-3 md:right-6 top-14 z-30 w-64 rounded-xl overflow-hidden shadow-xl" style={{ background: "#fff", border: `1px solid ${T.line}` }}>
            <div className="p-3 border-b" style={{ borderColor: T.line }}>
              <div className="text-xs font-bold" style={{ color: T.ink }}>Notifications</div>
            </div>
            <button onClick={() => { setTab("messages"); setShowNotifications(false); }}
              className="w-full text-left p-3 flex items-center gap-2.5 hover:bg-black/5">
              <MessageCircle size={15} style={{ color: T.signal }} />
              <div className="flex-1">
                <div className="text-xs font-semibold" style={{ color: T.ink }}>
                  {unreadCount > 0 ? `${unreadCount} unread conversation${unreadCount > 1 ? "s" : ""}` : "No unread messages"}
                </div>
                <div className="text-[10px]" style={{ color: T.sub }}>Tap to open Connect</div>
              </div>
            </button>
            <button onClick={() => { setTab("passport"); setShowNotifications(false); }}
              className="w-full text-left p-3 flex items-center gap-2.5 hover:bg-black/5 border-t" style={{ borderColor: T.line }}>
              <Languages size={15} style={{ color: T.sub }} />
              <div className="text-xs font-semibold" style={{ color: T.ink }}>Language & settings</div>
            </button>
          </div>
        )}
      </div>
      <UAEFlagStripe height={3} rounded={false} />

      {/* Content */}
      {tab === "pulse" && pulseSubTab === "reels" ? (
        <div key="pulse-reels" className="tab-fade fixed inset-x-0 top-14 bottom-16 md:bottom-0">
          <button
            onClick={() => setPulseSubTab("feed")}
            className="fixed z-40 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ top: 68, left: 12, background: "rgba(10,15,26,0.8)", color: "#fff", border: "1px solid #ffffff33", backdropFilter: "blur(6px)" }}
          >
            <ArrowLeft size={13} /> Pulse
          </button>
          <ReelsView liveViews={liveViews} properties={properties} onChat={() => setTab("messages")} />
        </div>
      ) : (
        <div key={tab} className="tab-fade pb-16 md:pb-0">
          {tab === "pulse" && (
            <>
              <SegmentedTabs
                accent={T.signal}
                active={pulseSubTab}
                onChange={setPulseSubTab}
                options={[
                  { id: "feed", label: "Discover", icon: LayoutGrid },
                  { id: "reels", label: "Reels", icon: PlayCircle },
                  { id: "stats", label: "Market Stats", icon: BarChart3 },
                  { id: "2040", label: "Vision 2040", icon: Leaf },
                ]}
              />
              {pulseSubTab === "feed" && (
                <FeedView
                  liveViews={liveViews}
                  properties={properties}
                  currentUser={currentUser}
                  onPropertyUpdated={(updated) => setProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))}
                />
              )}
              {pulseSubTab === "stats" && <DashboardView />}
              {pulseSubTab === "2040" && <Vision2040View properties={properties} liveViews={liveViews} />}
            </>
          )}
          {tab === "souk" && (
            <SoukView
              providers={services}
              statuses={verifyStatuses}
              properties={properties}
              onChat={() => setTab("messages")}
              onPublishService={async (s) => {
                setServices((prev) => [{ ...s, isLive: true, ownerId: currentUser?.id || null }, ...prev]);
                try {
                  const res = await fetch("/api/services", {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      title: s.title || s.name,
                      category: s.category || "service",
                      area: s.area,
                      priceText: s.price || s.priceText,
                      description: s.description,
                      ownerId: currentUser?.id || null,
                    }),
                  });
                  const data = await res.json().catch(() => null);
                  if (!res.ok) alert(`Heads up — this didn't save to the database: ${data?.error || res.status}`);
                } catch (e) {
                  alert(`Couldn't reach the server — ${e.message}. It's showing locally but won't survive a refresh until this is fixed.`);
                }
              }}
            />
          )}
          {tab === "investor" && (
            <InvestorZone
              liveViews={liveViews}
              properties={properties}
              currentUser={currentUser}
              onUpgrade={() => setTab("passport")}
            />
          )}
          {tab === "messages" && <MessagesView currentUser={currentUser} onSignIn={() => setShowAuthModal(true)} />}
          {tab === "community" && <CommunityView onOpenPost={() => setShowPostModal(true)} onOpenChat={() => setTab("messages")} currentUserId={currentUser?.id} />}
          {tab === "events" && <EventsView currentUser={currentUser} onSignIn={() => setShowAuthModal(true)} />}
          {tab === "transactions" && <TransactionsView />}
          {tab === "passport" && (
            <PassportView
              currentUser={currentUser}
              properties={properties}
              services={services}
              statuses={verifyStatuses}
              setStatuses={setVerifyStatuses}
              settings={settings}
              setSettings={setSettings}
              onSignOut={handleSignOut}
              onSignIn={() => setShowAuthModal(true)}
              onUserUpdated={handleUserUpdated}
            />
          )}
          {tab === "newcomer" && <NewcomerJourney onComplete={() => { setTab("pulse"); setPulseSubTab("feed"); }} onGoTo={(t) => setTab(t)} />}
          {tab === "jobs" && <JobsView verifyStatuses={verifyStatuses} currentUser={currentUser} onSignIn={() => setShowAuthModal(true)} services={services} />}
        </div>
      )}

      {loadError && (
        <div className="fixed top-0 left-0 right-0 z-[60] px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-medium"
          style={{ background: "#E0554C", color: "#fff" }}>
          <span>⚠️ {loadError}</span>
          <button onClick={() => setLoadError(null)} style={{ opacity: 0.85 }}><X size={14} /></button>
        </div>
      )}
      {showAuthModal && <AuthModal onClose={() => setShowAuthModal(false)} onAuthed={handleAuthed} />}
      {showPostModal && (
        <PostPropertyModal
          onClose={() => setShowPostModal(false)}
          statuses={verifyStatuses}
          onPublish={handlePublish}
        />
      )}

      {/* AMBIENT AI LISTENING EDGE — pulses to signal Junction AI has context */}
      {!(tab === "pulse" && pulseSubTab === "reels") && (
        <div className="fixed left-0 z-30"
          style={{
            top:"20%", width:"3px", height:"60%",
            background:"linear-gradient(to bottom,transparent,#00CFFF,transparent)",
            animation:"listeningEdge 3s ease-in-out infinite",
            borderRadius:"0 3px 3px 0", cursor:"pointer",
          }}
          onClick={() => { const b=document.getElementById("j-ai-btn"); if(b) b.click(); }}
        />
      )}
      {!(tab === "pulse" && pulseSubTab === "reels") && (
        <AIAssistant
          properties={properties}
          threads={CHAT_THREADS}
          onOpenPost={() => setShowPostModal(true)}
          autoQuery={aiAutoQuery}
          currentUser={currentUser}
          onPublishDraft={publishPropertyDraft}
        />
      )}

      {/* ORBITAL NAVIGATION — 6 primary nodes (Pulse, Invest, Connect, Souk,
          Passport, Work) + a short secondary row for the less-frequent
          destinations. Pulse/Souk/Passport each fold 2-4 old tabs into one. */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: T.ink, borderTop:`1px solid ${T.inkLine}` }}>
        <div className="flex items-center justify-around px-1 pt-2 pb-1">
          {[
            {id:"pulse",    icon:LayoutGrid,    label:"Pulse",    color:"#FF5A36"},
            {id:"investor", icon:Lock,          label:"Invest",   color:"#C9A227"},
            {id:"messages", icon:MessageCircle, label:"Connect",  color:"#00CFFF"},
            {id:"souk",     icon:Wrench,        label:"Souk",     color:"#1F7A4D"},
            {id:"jobs",     icon:Briefcase,     label:"Work",     color:"#C9A227"},
            {id:"passport", icon:UserCheck,     label:"Passport", color:"#7B8AA0"},
          ].map((n) => {
            const Icon = n.icon;
            const isActive = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                className="flex flex-col items-center gap-0.5">
                <div className="flex items-center justify-center rounded-full"
                  style={{
                    width:40, height:40,
                    background: isActive ? n.color : "transparent",
                    border: isActive ? `2px solid ${n.color}` : "2px solid transparent",
                    boxShadow: isActive ? `0 0 14px ${n.color}88` : "none",
                    transition: "all .25s cubic-bezier(.34,1.56,.64,1)",
                    transform: isActive ? "scale(1.1)" : "scale(1)",
                  }}>
                  <Icon size={16} color={isActive ? "#fff" : T.sub}/>
                </div>
                <span className="text-[9px] font-medium"
                  style={{ color: isActive ? n.color : T.sub }}>{n.label}</span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center justify-center gap-2 px-2 pb-2 flex-wrap">
          {[
            {id:"community",   label:"Community",    icon:Users},
            {id:"events",      label:"Events",       icon:PartyPopper},
            {id:"newcomer",    label:"New to UAE",   icon:Globe2},
            {id:"transactions",label:"Transactions", icon:CreditCard},
          ].map((n) => {
            const Icon = n.icon;
            const isActive = tab === n.id;
            return (
              <button key={n.id} onClick={() => setTab(n.id)}
                className="flex items-center gap-1 text-[9px] font-medium px-2 py-1 rounded-full"
                style={{
                  color: isActive ? T.signal : T.sub,
                  background: isActive ? `${T.signal}18` : "transparent",
                  border: isActive ? `1px solid ${T.signal}44` : "1px solid transparent",
                }}>
                <Icon size={10}/> {n.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppInner />
    </ErrorBoundary>
  );
}
