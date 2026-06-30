import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculateGPA, sortExamRecordsByYear } from "@/lib/grades";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");

    if (!classId) {
      return NextResponse.json({ error: "classId is required" }, { status: 400 });
    }

    const cls = await prisma.class.findUnique({
      where: { id: Number(classId) },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const students = await prisma.student.findMany({
      where: { classId: Number(classId), status: "Admitted" },
      select: {
        id: true,
        studentId: true,
        firstName: true,
        lastName: true,
        admissionDate: true,
        department: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });

    const transcripts: {
      student: {
        id: number;
        studentId: string;
        firstName: string;
        lastName: string;
        admissionDate?: Date;
        department: {
          id: number;
          name: string;
          code: string;
        };
      };
      records: { id: number; year: number; totalMarks: number; grade: string | null; gradePoints: number | null; course: { code: string; name: string; creditHours: number } }[];
      gpa: { cumulativeGPA: number; totalCredits: number; years: { year: number; gpa: number; totalCredits: number; totalGradePoints: number; courses: number }[] };
    }[] = [];

    for (const student of students) {
      const recordsRaw = await prisma.examRecord.findMany({
        where: { studentId: student.id },
        include: {
          course: { select: { id: true, name: true, code: true, creditHours: true } },
        },
      });

      const records = sortExamRecordsByYear(recordsRaw);

      const gpaData = calculateGPA(
        records.map((r) => ({
          year: r.year,
          gradePoints: r.gradePoints,
          creditHours: r.course.creditHours,
        }))
      );

      transcripts.push({
        student: {
          id: student.id,
          studentId: student.studentId,
          firstName: student.firstName,
          lastName: student.lastName,
          admissionDate: student.admissionDate,
          department: student.department,
        },
        records: records.map((r) => ({
          id: r.id,
          year: r.year,
          totalMarks: r.totalMarks,
          grade: r.grade,
          gradePoints: r.gradePoints,
          course: r.course,
        })),
        gpa: gpaData,
      });
    }

    return NextResponse.json({
      class: cls,
      transcripts,
    });
  } catch (e) {
    console.error("Class transcript error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
