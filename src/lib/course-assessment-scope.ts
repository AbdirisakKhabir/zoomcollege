import { prisma } from "@/lib/prisma";
import { DEFAULT_ASSESSMENT_BLUEPRINT } from "@/lib/course-assessments";

export type ClassOptionForCourse = {
  id: number;
  name: string;
  department: { id: number; name: string; code: string };
  lecturer: { id: number; name: string } | null;
};

/** Active classes in the same department as the course. */
export async function listClassesForCourse(
  courseId: number
): Promise<ClassOptionForCourse[]> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { departmentId: true },
  });
  if (!course) return [];

  const classes = await prisma.class.findMany({
    where: {
      departmentId: course.departmentId,
      isActive: true,
    },
    include: {
      department: { select: { id: true, name: true, code: true } },
      classSchedules: {
        where: { courseId },
        include: {
          lecturer: { select: { id: true, name: true } },
        },
        take: 1,
      },
    },
    orderBy: [{ name: "asc" }],
  });

  return classes.map((cls) => {
    const sched = cls.classSchedules[0];
    return {
      id: cls.id,
      name: cls.name,
      department: cls.department,
      lecturer: sched?.lecturer
        ? { id: sched.lecturer.id, name: sched.lecturer.name }
        : null,
    };
  });
}

/** Ensures the class is active and shares the same department as the course. */
export async function validateClassCourseAssignment(
  courseId: number,
  classId: number
): Promise<{ ok: true } | { ok: false; error: string }> {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, departmentId: true, code: true, name: true },
  });
  if (!course) {
    return { ok: false, error: "Course not found" };
  }

  const cls = await prisma.class.findUnique({
    where: { id: classId },
    select: {
      id: true,
      name: true,
      departmentId: true,
      isActive: true,
    },
  });
  if (!cls) {
    return { ok: false, error: "Class not found" };
  }

  if (cls.departmentId !== course.departmentId) {
    return {
      ok: false,
      error: "Class and course must belong to the same department",
    };
  }

  if (!cls.isActive) {
    return { ok: false, error: "Class is not active" };
  }

  return { ok: true };
}

/** Inserts the standard blueprint when a class+course has no assessments yet. */
export async function seedDefaultAssessmentsIfEmpty(
  courseId: number,
  classId: number
): Promise<void> {
  const n = await prisma.courseAssessment.count({
    where: { courseId, classId },
  });
  if (n > 0) return;
  await prisma.courseAssessment.createMany({
    data: DEFAULT_ASSESSMENT_BLUEPRINT.map((b) => ({
      courseId,
      classId,
      name: b.name,
      key: b.key,
      weightPercent: b.weightPercent,
      sortOrder: b.sortOrder,
    })),
  });
}

export async function loadAssessmentsForClassCourse(
  courseId: number,
  classId: number,
  options?: { seedIfEmpty?: boolean }
) {
  if (options?.seedIfEmpty) {
    await seedDefaultAssessmentsIfEmpty(courseId, classId);
  }
  return prisma.courseAssessment.findMany({
    where: { courseId, classId },
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
  });
}
