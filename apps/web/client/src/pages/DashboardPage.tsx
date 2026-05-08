import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Archive,
  BadgeDollarSign,
  Boxes,
  ClipboardList,
  DatabaseZap,
  Layers3,
  PackageCheck,
  SlidersHorizontal
} from "lucide-react";
import { dashboardApi, type DashboardCard } from "../api/client";
import { queryKeys } from "../api/queryKeys";
import { Badge } from "../components/Badge";

const cardIcons = {
  "field-collection": Archive,
  "mobile-received-data": DatabaseZap,
  processing: SlidersHorizontal,
  packaging: PackageCheck,
  labeling: ClipboardList,
  "order-management": PackageCheck,
  "inventory-management": Layers3,
  finance: BadgeDollarSign
};

const cardLinks: Record<string, string> = {
  "field-collection": "/admin/field-collection",
  "mobile-received-data": "/admin/field-monitor"
};

const toneClasses: Record<string, string> = {
  mint: "bg-gradient-to-br from-emerald-50 to-white",
  warm: "bg-gradient-to-br from-orange-50 to-white",
  sky: "bg-gradient-to-br from-blue-50 to-white",
  violet: "bg-gradient-to-br from-violet-50 to-white",
  rose: "bg-gradient-to-br from-rose-50 to-white",
  cyan: "bg-gradient-to-br from-cyan-50 to-white",
  cream: "bg-gradient-to-br from-amber-50 to-white"
};

function DashboardCardView({ card }: { card: DashboardCard }) {
  const Icon = cardIcons[card.key as keyof typeof cardIcons] ?? Boxes;
  const content = (
    <article
      className={`min-h-[170px] rounded-md border border-slate-200 p-4 shadow-panel transition ${
        cardLinks[card.key] ? "hover:border-blue-300 hover:shadow-md" : ""
      } ${toneClasses[card.tone]}`}
    >
      <div className="flex items-start gap-4">
        <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/70 text-blue-600 shadow-sm">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <h2 className="text-lg font-bold text-slate-950">{card.title}</h2>
          <p className="mt-1 text-sm text-slate-700">{card.total} total</p>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-3">
        {card.badges.map((badge) => (
          <Badge key={badge.label} tone={badge.tone}>
            {badge.label}: {badge.value}
          </Badge>
        ))}
      </div>
    </article>
  );

  return cardLinks[card.key] ? (
    <Link to={cardLinks[card.key]} className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
      {content}
    </Link>
  ) : (
    content
  );
}

export function DashboardPage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: dashboardApi.summary
  });

  if (isLoading) {
    return <div className="rounded-md border border-slate-200 bg-white p-6 text-sm font-semibold">Loading dashboard...</div>;
  }

  if (isError || !data) {
    return <div className="rounded-md border border-red-200 bg-red-50 p-6 text-sm font-semibold text-red-700">Could not load dashboard summary.</div>;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      {data.cards.map((card) => (
        <DashboardCardView key={card.key} card={card} />
      ))}
    </div>
  );
}
