import type { ReactNode } from "react";
import { StatCard } from "@/components/common/bits";

export interface StatSpec {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
}

export function StatCardRow({ stats }: { stats: StatSpec[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} {...stat} />
      ))}
    </div>
  );
}
