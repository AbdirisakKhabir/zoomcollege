"use client";
import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "../context/SidebarContext";
import { useAuth } from "../context/AuthContext";
import { BRAND } from "@/lib/brand";
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  DollarSign,
  FileText,
  FolderKanban,
  GraduationCap,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Shield,
  Users,
} from "lucide-react";

// --- Types ---

type SubItem = {
  name: string;
  path: string;
  pro?: boolean;
  new?: boolean;
  permission?: string;
};

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  permission?: string;
  subItems?: SubItem[];
};

type MenuCategory = "academics" | "reports" | "hr" | "activities";

// --- Data Structures ---

// Academics (top): Dashboard, Faculties, Departments, Courses, Classes, Admission, Attendance, Examinations
const academicsItems: NavItem[] = [
  {
    icon: <LayoutDashboard strokeWidth={1.8} />,
    name: "Dashboard",
    path: "/",
    permission: "dashboard.view",
  },
  {
    icon: <MessageCircle strokeWidth={1.8} />,
    name: "Messages",
    path: "/messages",
  },
  {
    icon: <FolderKanban strokeWidth={1.8} />,
    name: "Departments",
    path: "/departments",
    permission: "departments.view",
  },
  {
    icon: <BookOpen strokeWidth={1.8} />,
    name: "Courses",
    path: "/courses",
    permission: "courses.view",
  },
  {
    icon: <CalendarDays strokeWidth={1.8} />,
    name: "Classes",
    path: "/classes",
    permission: "classes.view",
  },
  {
    icon: <Users strokeWidth={1.8} />,
    name: "Lecturers",
    path: "/lecturers",
    permission: "lecturers.view",
  },
  {
    icon: <FileText strokeWidth={1.8} />,
    name: "Admission",
    path: "/admission",
    permission: "admission.view",
    subItems: [
      { name: "Student List", path: "/admission", permission: "admission.view" },
      { name: "Case Recording", path: "/admission/cases", permission: "admission.view" },
      { name: "Upgrade Students", path: "/admission/upgrade", permission: "admission.edit" },
      { name: "Transfer Student", path: "/admission/transfer", permission: "admission.edit" },
    ],
  },
  {
    icon: <ClipboardList strokeWidth={1.8} />,
    name: "Attendance",
    path: "/attendance",
    permission: "attendance.view",
  },
  {
    icon: <ClipboardList strokeWidth={1.8} />,
    name: "Examinations",
    path: "/examinations",
    permission: "examinations.view",
    subItems: [
      { name: "Exam Records", path: "/examinations", permission: "examinations.view" },
      { name: "Record Exams", path: "/examinations/record", permission: "examinations.create" },
      { name: "Student Transcript", path: "/examinations/transcript", permission: "examinations.view" },
    ],
  },
  {
    icon: <DollarSign strokeWidth={1.8} />,
    name: "Finance",
    path: "/finance/collect-monthly-fee",
    permission: "finance.view",
    subItems: [
      { name: "Collect monthly fee", path: "/finance/collect-monthly-fee", permission: "finance.view" },
      { name: "Collect registration fee", path: "/finance/tuition-payment", permission: "finance.view" },
      { name: "Monthly invoice", path: "/finance/monthly-invoice", permission: "finance.view" },
      { name: "Payments", path: "/finance/payments", permission: "finance.view" },
      { name: "Accounts", path: "/finance/banks", permission: "banks.view" },
      { name: "Expenses", path: "/finance/expenses", permission: "expenses.view" },
    ],
  },
];

const hrItems: NavItem[] = [
  {
    icon: <Briefcase strokeWidth={1.8} />,
    name: "Human Resources",
    path: "/hr",
    permission: "hr.view",
    subItems: [
      { name: "Employees", path: "/hr/employees", permission: "hr.view" },
      { name: "Positions", path: "/hr/positions", permission: "hr.view" },
      { name: "Payroll Requests", path: "/hr/payroll", permission: "payroll.view" },
      { name: "HR Report", path: "/reports/hr", permission: "hr.view" },
    ],
  },
];

const reportsItems: NavItem[] = [
  {
    icon: <FileText strokeWidth={1.8} />,
    name: "Admission Report",
    path: "/reports/admission",
    permission: "reports.view",
  },
  {
    icon: <ClipboardList strokeWidth={1.8} />,
    name: "Attendance Report",
    path: "/reports/attendance",
    permission: "reports.view",
  },
  {
    icon: <GraduationCap strokeWidth={1.8} />,
    name: "Exam Report",
    path: "/reports/exam",
    permission: "reports.view",
  },
  {
    icon: <Users strokeWidth={1.8} />,
    name: "Lecturer Report",
    path: "/reports/lecturers",
    permission: "lecturers.view",
  },
  {
    icon: <Briefcase strokeWidth={1.8} />,
    name: "HR Report",
    path: "/reports/hr",
    permission: "hr.view",
  },
  {
    icon: <Users strokeWidth={1.8} />,
    name: "Students Report",
    path: "/reports/students-by-shift",
    permission: "reports.view",
  },
  {
    icon: <ClipboardList strokeWidth={1.8} />,
    name: "Absent Attendance",
    path: "/reports/absent-attendance",
    permission: "reports.view",
  },
  {
    icon: <DollarSign strokeWidth={1.8} />,
    name: "Finance Reports",
    path: "/reports/payment",
    permission: "reports.view",
    subItems: [
      { name: "Student Transactions", path: "/reports/student-transactions", permission: "reports.view" },
      { name: "Outstanding Balances", path: "/reports/outstanding-balances", permission: "reports.view" },
      { name: "Registration Fee", path: "/reports/registration-fee", permission: "reports.view" },
      { name: "Paid Students", path: "/reports/paid-students", permission: "reports.view" },
      { name: "Scholarship Report", path: "/reports/scholarship", permission: "reports.view" },
      { name: "Individual Student", path: "/reports/individual-student", permission: "reports.view" },
      { name: "Revenue Summary", path: "/reports/revenue-summary", permission: "reports.view" },
      { name: "Unpaid Students", path: "/reports/unpaid-students", permission: "reports.view" },
      { name: "Account Balances", path: "/reports/bank-balances", permission: "banks.view" },
      { name: "Account Transactions", path: "/reports/bank-transactions", permission: "banks.view" },
      { name: "Transaction History", path: "/reports/transaction-history", permission: "finance.view" },
      { name: "Daily Report", path: "/reports/daily-revenue", permission: "finance.view" },
      { name: "Expense Report", path: "/reports/expenses", permission: "expenses.view" },
      { name: "Income Statement", path: "/reports/income-statement", permission: "finance.view" },
    ],
  },
];

// Activities (bottom): Users, Roles, Permissions
const activitiesItems: NavItem[] = [
  {
    icon: <Users strokeWidth={1.8} />,
    name: "Users",
    path: "/users",
    permission: "users.view",
  },
  {
    icon: <Shield strokeWidth={1.8} />,
    name: "Roles",
    path: "/roles",
    permission: "roles.view",
  },
  {
    icon: <Shield strokeWidth={1.8} />,
    name: "Permissions",
    path: "/permissions",
    permission: "permissions.view",
  },
];

// --- Helper Functions ---

function filterByPermission<T extends { permission?: string; subItems?: SubItem[] }>(
  items: T[],
  hasPermission: (p: string) => boolean
): T[] {
  return items
    .filter((item) => !item.permission || hasPermission(item.permission))
    .map((item) => {
      if (!item.subItems) return item;
      const filteredSub = item.subItems.filter(
        (s) => !s.permission || hasPermission(s.permission)
      );
      return { ...item, subItems: filteredSub.length ? filteredSub : undefined };
    })
    .filter((item) => !item.subItems || (item.subItems && item.subItems.length > 0));
}

// --- Component ---

const AppSidebar: React.FC = () => {
  const { isExpanded, isMobileOpen, isHovered, setIsHovered } = useSidebar();
  const { hasPermission } = useAuth();
  const pathname = usePathname();

  // Filtered menus (memoized to prevent useEffect infinite loop)
  const academicsNav = useMemo(() => filterByPermission(academicsItems, hasPermission), [hasPermission]);
  const reportsNav = useMemo(() => filterByPermission(reportsItems, hasPermission), [hasPermission]);
  const hrNav = useMemo(() => filterByPermission(hrItems, hasPermission), [hasPermission]);
  const activitiesNav = useMemo(() => filterByPermission(activitiesItems, hasPermission), [hasPermission]);

  // State
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: MenuCategory;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback((path: string) => path === pathname, [pathname]);

  const handleSubmenuToggle = (index: number, menuType: MenuCategory) => {
    setOpenSubmenu((prev) => {
      if (prev?.type === menuType && prev?.index === index) {
        return null;
      }
      return { type: menuType, index };
    });
  };

  // Effect: Auto-open submenu based on current path
  useEffect(() => {
    let submenuMatched = false;
    let matchedState: { type: MenuCategory; index: number } | null = null;
    const categories: MenuCategory[] = ["academics", "reports", "hr", "activities"];

    categories.forEach((menuType) => {
      const items =
        menuType === "academics" ? academicsNav :
        menuType === "reports" ? reportsNav :
        menuType === "hr" ? hrNav : activitiesNav;

      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (subItem.path === pathname) {
              matchedState = { type: menuType, index };
              submenuMatched = true;
            }
          });
        }
      });
    });

    setOpenSubmenu((prev) => {
      if (submenuMatched && matchedState) {
        if (prev?.type === matchedState.type && prev?.index === matchedState.index) return prev;
        return matchedState;
      }
      if (!submenuMatched && prev === null) return prev;
      return null;
    });
  }, [pathname, academicsNav, reportsNav, hrNav, activitiesNav]);

  // Effect: Update height for transitions (measure after DOM update)
  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      const measure = () => {
        const el = subMenuRefs.current[key];
        if (el?.scrollHeight) {
          setSubMenuHeight((prev) => ({ ...prev, [key]: el.scrollHeight }));
        }
      };
      measure();
      requestAnimationFrame(measure);
    }
  }, [openSubmenu]);

  const renderMenuItems = (items: NavItem[], menuType: MenuCategory) => (
    <ul className="flex flex-col gap-1.5">
      {items.map((nav, index) => (
        <li key={nav.name}>
          {nav.subItems ? (
            <>
              <button
                onClick={() => handleSubmenuToggle(index, menuType)}
                className={`menu-item group ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "menu-item-active"
                    : "menu-item-inactive"
                } cursor-pointer ${
                  !isExpanded && !isHovered ? "lg:justify-center" : "lg:justify-start"
                }`}
              >
                <span
                  className={`menu-item-icon shrink-0 [&_svg]:size-5 ${
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? "menu-item-icon-active"
                      : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <>
                    <span className="menu-item-text truncate">{nav.name}</span>
                    <ChevronDown
                      className={`ml-auto size-[18px] shrink-0 transition-transform duration-200 ${
                        openSubmenu?.type === menuType && openSubmenu?.index === index
                          ? "rotate-180 text-brand-500"
                          : ""
                      }`}
                    />
                  </>
                )}
              </button>

              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType && openSubmenu?.index === index
                      ? (subMenuHeight[`${menuType}-${index}`] != null ? `${subMenuHeight[`${menuType}-${index}`]}px` : "auto")
                      : "0px",
                }}
              >
                <ul className="mt-1.5 space-y-1 ml-8 border-l border-gray-200 pl-2 dark:border-gray-700">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        href={subItem.path}
                        className={`menu-dropdown-item ${
                          isActive(subItem.path)
                            ? "menu-dropdown-item-active"
                            : "menu-dropdown-item-inactive"
                        }`}
                      >
                        {subItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          ) : (
            nav.path && (
              <Link
                href={nav.path}
                className={`menu-item group ${
                  isActive(nav.path) ? "menu-item-active" : "menu-item-inactive"
                }`}
              >
                <span
                  className={`menu-item-icon shrink-0 [&_svg]:size-5 ${
                    isActive(nav.path) ? "menu-item-icon-active" : "menu-item-icon-inactive"
                  }`}
                >
                  {nav.icon}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <span className="menu-item-text truncate">{nav.name}</span>
                )}
              </Link>
            )
          )}
        </li>
      ))}
    </ul>
  );

  return (
    <aside
      className={`no-print fixed left-0 top-0 z-50 flex h-screen min-h-0 flex-col border-r border-gray-200 bg-white text-gray-900 transition-all duration-300 ease-in-out dark:border-gray-800 dark:bg-gray-900 
        ${isExpanded || isMobileOpen || isHovered ? "w-[290px]" : "w-[90px]"}
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        mt-16 lg:mt-0 lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`shrink-0 border-b border-gray-100 px-4 py-4 dark:border-gray-800 ${!isExpanded && !isHovered && !isMobileOpen ? "lg:justify-center" : ""} flex`}
      >
        <Link href="/" className={`flex min-w-0 items-center gap-2.5 ${!isExpanded && !isHovered && !isMobileOpen ? "lg:justify-center" : ""}`}>
          <Image
            src={BRAND.logoUrl}
            alt={BRAND.logoAlt}
            width={40}
            height={40}
            priority
            className="object-contain h-10 w-10 shrink-0"
          />
          {(isExpanded || isHovered || isMobileOpen) && (
            <span className="line-clamp-2 text-sm font-semibold leading-snug text-gray-800 dark:text-white/90">
              {BRAND.name}
            </span>
          )}
        </Link>
      </div>

      <div className="sidebar-scrollbar min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-3 pb-5 pt-5 sm:pr-3 [-webkit-overflow-scrolling:touch]">
        <nav className="pb-2">
          <div className="flex flex-col gap-7">
            {/* Academics Section (top) */}
            {academicsNav.length > 0 && (
              <div>
                <h2 className={`mb-2 flex text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Academics" : <MoreHorizontal className="size-4" strokeWidth={1.8} />}
                </h2>
                {renderMenuItems(academicsNav, "academics")}
              </div>
            )}

            {/* HR Section */}
            {hrNav.length > 0 && (
              <div>
                <h2 className={`mb-2 flex text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Human Resources" : <MoreHorizontal className="size-4" strokeWidth={1.8} />}
                </h2>
                {renderMenuItems(hrNav, "hr")}
              </div>
            )}

            {/* Reports Section */}
            {reportsNav.length > 0 && (
              <div>
                <h2 className={`mb-2 flex text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Reports" : <MoreHorizontal className="size-4" strokeWidth={1.8} />}
                </h2>
                {renderMenuItems(reportsNav, "reports")}
              </div>
            )}

            {/* Activities Section (bottom): Users, Roles, Permissions */}
            {activitiesNav.length > 0 && (
              <div>
                <h2 className={`mb-2 flex text-[11px] font-semibold uppercase tracking-wider text-gray-400 ${!isExpanded && !isHovered ? "lg:justify-center" : "justify-start"}`}>
                  {isExpanded || isHovered || isMobileOpen ? "Activities" : <MoreHorizontal className="size-4" strokeWidth={1.8} />}
                </h2>
                {renderMenuItems(activitiesNav, "activities")}
              </div>
            )}
          </div>
        </nav>
      </div>
    </aside>
  );
};

export default AppSidebar;