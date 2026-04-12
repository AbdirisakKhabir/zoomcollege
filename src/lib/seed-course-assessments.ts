import { prisma } from "@/lib/prisma";
import { DEFAULT_ASSESSMENT_BLUEPRINT } from "@/lib/course-assessments";

/** Inserts the standard 6-component blueprint when a course has no assessments. */
export async function seedDefaultAssessmentsIfEmpty(courseId: number): Promise<void> {
  const n = await prisma.courseAssessment.count({ where: { courseId } });
  if (n > 0) return;
  await prisma.courseAssessment.createMany({
    data: DEFAULT_ASSESSMENT_BLUEPRINT.map((b) => ({
      courseId,
      name: b.name,
      key: b.key,
      weightPercent: b.weightPercent,
      sortOrder: b.sortOrder,
    })),
  });
}
