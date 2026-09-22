"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import type { EbookProgress, EbookUnit, LearningState } from "./EbookTypes";
import { deriveLearningState } from "./EbookTypes";

export type UnitFilter = "all" | Exclude<LearningState, "unlearned">;

const FILTERS: { id: UnitFilter; label: string; heading: string }[] = [
  { id: "all", label: "All", heading: "All" },
  { id: "learning", label: "Learning", heading: "Learning" },
  { id: "learned", label: "Learned", heading: "Learned" },
  { id: "review", label: "Review", heading: "Review" },
];

const stateLabel: Record<LearningState, string> = {
  unlearned: "Unlearned",
  learning: "Learning",
  learned: "Learned",
  review: "Review",
};

export default function UnitNavigator({
  units,
  progress,
  selected,
  search,
  filter,
  onSelect,
  onSearch,
  onFilter,
  disabled = false,
}: {
  units: EbookUnit[];
  progress: Record<string, EbookProgress>;
  selected: string;
  search: string;
  filter: UnitFilter;
  onSelect: (id: string) => void;
  onSearch: (value: string) => void;
  onFilter: (value: UnitFilter) => void;
  disabled?: boolean;
}) {
  const query = search.trim().toLocaleLowerCase();
  const visible = units.filter((unit) => {
    const status = deriveLearningState(progress[unit.id]);
    const matchesFilter = filter === "all" || status === filter;
    const matchesQuery = `${unit.number} ${unit.title}`.toLocaleLowerCase().includes(query);
    return matchesFilter && matchesQuery;
  });

  const counts = FILTERS.reduce<Record<UnitFilter, number>>((result, item) => {
    result[item.id] =
      item.id === "all"
        ? units.length
        : units.filter((unit) => deriveLearningState(progress[unit.id]) === item.id).length;
    return result;
  }, { all: units.length, learning: 0, learned: 0, review: 0 });

  return (
    <aside className="ebook-unit-nav card" aria-label="Unit navigation">
      <div className="ebook-unit-nav-title">
        <div>
          <span className="eyebrow">YOUR COURSE</span>
          <h2>Units</h2>
        </div>
        <SlidersHorizontal size={18} aria-hidden="true" />
      </div>
      <label className="ebook-search">
        <span className="sr-only">Search units</span>
        <Search size={17} aria-hidden="true" />
        <input
          aria-label="Search units"
          value={search}
          onChange={(event) => onSearch(event.target.value)}
          placeholder="Search units"
        />
      </label>
      <div className="ebook-filter-grid" aria-label="Progress filters">
        {FILTERS.map((item) => (
          <button
            type="button"
            key={item.id}
            className={filter === item.id ? "active" : ""}
            aria-pressed={filter === item.id}
            onClick={() => onFilter(item.id)}
          >
            <span className="ebook-filter-heading">{item.heading}</span>
            <small>{counts[item.id]}</small>
          </button>
        ))}
      </div>
      <div className="ebook-units" aria-label={`${filter} units`}>
        {visible.map((unit) => {
          const status = deriveLearningState(progress[unit.id]);
          const unitProgress = progress[unit.id];
          return (
            <button
              type="button"
              key={unit.id}
              className={`ebook-unit ${unit.id === selected ? "active" : ""}`}
              aria-current={unit.id === selected ? "page" : undefined}
              disabled={disabled}
              onClick={() => onSelect(unit.id)}
            >
              <span className="ebook-unit-number">{unit.number}</span>
              <span className="ebook-unit-copy">
                <strong>{unit.title}</strong>
                <small>{stateLabel[status]} · {unitProgress?.percent ?? 0}%</small>
              </span>
              <span className={`ebook-status-dot ${status}`} aria-label={stateLabel[status]} />
            </button>
          );
        })}
        {!visible.length && <p className="ebook-empty">No units match this filter.</p>}
      </div>
    </aside>
  );
}
