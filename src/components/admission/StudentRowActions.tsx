"use client";

import Link from "next/link";
import { EllipsisVertical, Eye, Pencil, Trash2 } from "lucide-react";
import { Dropdown } from "@/components/ui/dropdown/Dropdown";

type Props = {
  studentId: string;
  editId: number;
  canEdit: boolean;
  canDelete: boolean;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  onDelete: () => void;
};

const itemBase =
  "flex w-full items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/5";

export default function StudentRowActions({
  studentId,
  editId,
  canEdit,
  canDelete,
  isOpen,
  onToggle,
  onClose,
  onDelete,
}: Props) {
  const hasActions = canEdit || canDelete;

  return (
    <div className="relative flex justify-end">
      <button
        type="button"
        onClick={onToggle}
        className="dropdown-toggle inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-white/5 dark:hover:text-gray-200"
        aria-label="Student actions"
        aria-expanded={isOpen}
      >
        <EllipsisVertical className="h-4 w-4" strokeWidth={1.8} />
      </button>
      <Dropdown isOpen={isOpen} onClose={onClose} className="min-w-[11rem] py-1">
        <Link
          href={`/students/${encodeURIComponent(studentId)}`}
          className={`${itemBase}`}
          onClick={onClose}
        >
          <Eye className="h-4 w-4 shrink-0" strokeWidth={1.8} />
          View profile
        </Link>
        {canEdit && (
          <Link
            href={`/admission/${editId}/edit`}
            className={itemBase}
            onClick={onClose}
          >
            <Pencil className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            Edit student
          </Link>
        )}
        {canDelete && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onDelete();
            }}
            className={`${itemBase} text-error-600 hover:bg-error-50 dark:text-error-400 dark:hover:bg-error-500/10`}
          >
            <Trash2 className="h-4 w-4 shrink-0" strokeWidth={1.8} />
            Delete
          </button>
        )}
        {!hasActions && (
          <p className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500">No actions available</p>
        )}
      </Dropdown>
    </div>
  );
}
