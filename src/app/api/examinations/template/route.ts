import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import {
  loadAssessmentsForClassCourse,
  seedDefaultAssessmentsIfEmpty,
} from "@/lib/course-assessment-scope";
import { fetchClassCourseAttendanceSummary } from "@/lib/exam-attendance";

export async function GET(req: NextRequest) {
  try {
    const auth = await getAuthUser(req);
    if (!auth) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const classId = searchParams.get("classId");
    const courseId = searchParams.get("courseId");
    if (!classId || !courseId) {
      return NextResponse.json(
        { error: "classId and courseId are required to download template" },
        { status: 400 }
      );
    }

    const cls = await prisma.class.findUnique({
      where: { id: Number(classId) },
      include: { department: { select: { id: true, name: true, code: true } } },
    });

    if (!cls) {
      return NextResponse.json({ error: "Class not found" }, { status: 404 });
    }

    const course = await prisma.course.findUnique({
      where: { id: Number(courseId) },
    });
    if (!course || course.departmentId !== cls.departmentId) {
      return NextResponse.json(
        { error: "Course not found or does not belong to the class's department" },
        { status: 400 }
      );
    }

    await seedDefaultAssessmentsIfEmpty(course.id, Number(classId));

    const assessments = await loadAssessmentsForClassCourse(
      course.id,
      Number(classId)
    );

    const students = await prisma.student.findMany({
      where: { classId: Number(classId), status: "Admitted" },
      select: { id: true, studentId: true, firstName: true, lastName: true },
      orderBy: [{ studentId: "asc" }],
    });

    const studentIds = students.map((s) => s.id);
    const { totalSessions, byStudent: attendanceByStudent } =
      await fetchClassCourseAttendanceSummary(
        Number(classId),
        course.id,
        studentIds
      );

    const assessmentHeaders = assessments.map(
      (a) => `${a.name} (${a.weightPercent}%)`
    );

    const headers = [
      "S/No",
      "ID Card",
      "Student's Name",
      ...assessmentHeaders,
      "Attendance",
      "Total",
      "Grade",
      "GPA",
    ];

    const rows = students.map((s, idx) => {
      const attendanceMarks =
        attendanceByStudent.get(s.id)?.attendanceMarks ?? 0;
      const blankAssess = assessments.map(() => "");
      return [
        idx + 1,
        s.studentId,
        `${s.firstName} ${s.lastName}`,
        ...blankAssess,
        totalSessions > 0 ? attendanceMarks.toFixed(2) : "",
        "",
        "",
        "",
      ];
    });

    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    const colWidths = [
      { wch: 6 },
      { wch: 14 },
      { wch: 28 },
      ...assessments.map(() => ({ wch: 14 })),
      { wch: 12 },
      { wch: 8 },
      { wch: 6 },
      { wch: 6 },
    ];
    ws["!cols"] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      ws,
      `Exam ${course.code}`
    );

    const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    const filename = `Exam_Template_${course.code}_${cls.name}.xlsx`;

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("Template download error:", e);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
